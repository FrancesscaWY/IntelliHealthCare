import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isIP } from "node:net";
import type { EnvironmentVariables } from "../config/env.schema";
import type { AuthenticatedUser } from "./auth.types";

type IpFamily = 4 | 6;

interface ParsedIp {
  family: IpFamily;
  bits: 32 | 128;
  value: bigint;
}

interface ParsedCidr extends ParsedIp {
  prefixLength: number;
}

interface InternalGuardRequest {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string | null;
  };
  user?: AuthenticatedUser;
}

@Injectable()
export class InternalAccessGuard implements CanActivate {
  private readonly allowedCidrs: ParsedCidr[];
  private readonly trustProxyHeaders: boolean;
  private readonly sharedSecret: string;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {
    this.allowedCidrs = parseAllowedCidrs(
      this.configService.get("INTERNAL_API_ALLOWED_CIDRS", { infer: true })
    );
    this.trustProxyHeaders = this.configService.get(
      "INTERNAL_API_TRUST_PROXY_HEADERS",
      { infer: true }
    );
    this.sharedSecret = this.configService
      .get("INTERNAL_API_SHARED_SECRET", { infer: true })
      .trim();
  }

  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<InternalGuardRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("Missing authenticated user");
    }

    if (user.scope !== "admin") {
      throw new ForbiddenException(
        "Internal APIs require an admin-scope access token"
      );
    }

    if (this.sharedSecret) {
      const internalToken = resolveHeaderValue(
        request.headers["x-internal-token"]
      )?.trim();

      if (internalToken !== this.sharedSecret) {
        throw new ForbiddenException("Invalid internal access token");
      }
    }

    const clientIp = this.resolveClientIp(request);

    if (!clientIp) {
      throw new ForbiddenException(
        "Unable to determine client IP for internal access control"
      );
    }

    if (!this.isIpAllowed(clientIp)) {
      throw new ForbiddenException(
        `Client IP ${clientIp} is not allowed to access internal APIs`
      );
    }

    return true;
  }

  private resolveClientIp(request: InternalGuardRequest) {
    const candidates: string[] = [];

    if (this.trustProxyHeaders) {
      const forwardedFor = resolveHeaderValue(request.headers["x-forwarded-for"]);
      const forwarded = resolveHeaderValue(request.headers.forwarded);
      const realIp = resolveHeaderValue(request.headers["x-real-ip"]);

      if (forwardedFor) {
        candidates.push(
          ...forwardedFor
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        );
      }

      if (forwarded) {
        candidates.push(...extractForwardedForCandidates(forwarded));
      }

      if (realIp) {
        candidates.push(realIp);
      }
    }

    if (typeof request.ip === "string") {
      candidates.push(request.ip);
    }

    if (typeof request.socket?.remoteAddress === "string") {
      candidates.push(request.socket.remoteAddress);
    }

    for (const candidate of candidates) {
      const normalized = normalizeIp(candidate);

      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private isIpAllowed(ip: string) {
    const parsedIp = parseIp(ip);

    return this.allowedCidrs.some((cidr) => matchesCidr(parsedIp, cidr));
  }
}

function resolveHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function extractForwardedForCandidates(headerValue: string) {
  return headerValue
    .split(",")
    .map((segment) => segment.trim())
    .flatMap((segment) =>
      segment
        .split(";")
        .map((token) => token.trim())
        .filter((token) => token.toLowerCase().startsWith("for="))
        .map((token) => token.slice(4).trim())
    );
}

function normalizeIp(value: string | null | undefined) {
  let candidate = value?.trim() ?? "";

  if (!candidate || candidate.toLowerCase() === "unknown") {
    return null;
  }

  candidate = candidate.replace(/^"+|"+$/g, "");

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.replace(/:\d+$/, "");
  }

  const zoneIndex = candidate.indexOf("%");

  if (zoneIndex >= 0) {
    candidate = candidate.slice(0, zoneIndex);
  }

  const ipv4Mapped = candidate.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);

  if (ipv4Mapped?.[1]) {
    candidate = ipv4Mapped[1];
  }

  return isIP(candidate) ? candidate : null;
}

function parseAllowedCidrs(rawValue: string) {
  const entries = rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error("INTERNAL_API_ALLOWED_CIDRS must contain at least one entry");
  }

  return entries.map((entry) => parseCidr(entry));
}

function parseCidr(entry: string): ParsedCidr {
  const [rawAddress, rawPrefix] = entry.split("/", 2);
  const address = normalizeIp(rawAddress);

  if (!address) {
    throw new Error(`Invalid INTERNAL_API_ALLOWED_CIDRS entry: ${entry}`);
  }

  const parsedIp = parseIp(address);
  const prefixLength =
    rawPrefix === undefined ? parsedIp.bits : Number.parseInt(rawPrefix, 10);

  if (
    !Number.isInteger(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > parsedIp.bits
  ) {
    throw new Error(`Invalid INTERNAL_API_ALLOWED_CIDRS entry: ${entry}`);
  }

  return {
    ...parsedIp,
    prefixLength
  };
}

function parseIp(ip: string): ParsedIp {
  const family = isIP(ip);

  if (family === 4) {
    return {
      family: 4,
      bits: 32,
      value: ipv4ToBigInt(ip)
    };
  }

  if (family === 6) {
    return {
      family: 6,
      bits: 128,
      value: ipv6ToBigInt(ip)
    };
  }

  throw new Error(`Invalid IP address: ${ip}`);
}

function matchesCidr(ip: ParsedIp, cidr: ParsedCidr) {
  if (ip.family !== cidr.family) {
    return false;
  }

  const shift = BigInt(ip.bits - cidr.prefixLength);

  if (shift === 0n) {
    return ip.value === cidr.value;
  }

  return (ip.value >> shift) === (cidr.value >> shift);
}

function ipv4ToBigInt(ip: string) {
  return ip
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .reduce((result, octet) => (result << 8n) + BigInt(octet), 0n);
}

function ipv6ToBigInt(ip: string) {
  return expandIpv6(ip).reduce((result, group) => {
    if (!/^[\da-f]{1,4}$/i.test(group)) {
      throw new Error(`Invalid IPv6 address: ${ip}`);
    }

    return (result << 16n) + BigInt(Number.parseInt(group, 16));
  }, 0n);
}

function expandIpv6(ip: string) {
  const parts = ip.toLowerCase().split("::");

  if (parts.length > 2) {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  const head = expandIpv6Section(parts[0] ?? "");
  const tail = expandIpv6Section(parts[1] ?? "");

  if (parts.length === 1) {
    if (head.length !== 8) {
      throw new Error(`Invalid IPv6 address: ${ip}`);
    }

    return head;
  }

  const missingGroups = 8 - head.length - tail.length;

  if (missingGroups < 1) {
    throw new Error(`Invalid IPv6 address: ${ip}`);
  }

  return [
    ...head,
    ...Array.from({ length: missingGroups }, () => "0"),
    ...tail
  ];
}

function expandIpv6Section(section: string) {
  if (!section) {
    return [];
  }

  return section
    .split(":")
    .filter(Boolean)
    .flatMap((group) => {
      if (!group.includes(".")) {
        return [group];
      }

      const ipv4 = normalizeIp(group);

      if (!ipv4 || isIP(ipv4) !== 4) {
        throw new Error(`Invalid IPv6 address: ${section}`);
      }

      const octets = ipv4
        .split(".")
        .map((part) => Number.parseInt(part, 10));

      return [
        ((octets[0] << 8) | octets[1]).toString(16),
        ((octets[2] << 8) | octets[3]).toString(16)
      ];
    });
}

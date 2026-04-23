import { randomBytes, randomInt, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";

const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SCRYPT_N = 16384;
const PASSWORD_SCRYPT_R = 8;
const PASSWORD_SCRYPT_P = 1;
const PASSWORD_SCRYPT_MAX_MEMORY = 32 * 1024 * 1024;

export const LEGACY_DEMO_PASSWORD = "123456";

interface ParsedPasswordHash {
  keyLength: number;
  salt: string;
  derivedKey: string;
  options: {
    N: number;
    r: number;
    p: number;
    maxmem: number;
  };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const derivedKey = await scryptPassword(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_SCRYPT_N,
    r: PASSWORD_SCRYPT_R,
    p: PASSWORD_SCRYPT_P
  });

  return [
    PASSWORD_HASH_PREFIX,
    String(PASSWORD_SCRYPT_N),
    String(PASSWORD_SCRYPT_R),
    String(PASSWORD_SCRYPT_P),
    salt,
    derivedKey.toString("hex")
  ].join("$");
}

export async function verifyPassword(passwordHash: string, password: string) {
  const parsed = parsePasswordHash(passwordHash);

  if (!parsed) {
    return false;
  }

  const actual = await scryptPassword(password, parsed.salt, parsed.keyLength, parsed.options);
  const expected = Buffer.from(parsed.derivedKey, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function isSecurePasswordHash(passwordHash: string | null | undefined) {
  return typeof passwordHash === "string" && passwordHash.startsWith(`${PASSWORD_HASH_PREFIX}$`);
}

export function resolveLegacyPassword(passwordHash: string) {
  if (passwordHash.startsWith("demo_hash_")) {
    return LEGACY_DEMO_PASSWORD;
  }

  if (!passwordHash.includes("$")) {
    return passwordHash;
  }

  return null;
}

export function generateSmsCode() {
  return String(randomInt(100000, 1000000));
}

async function scryptPassword(
  password: string,
  salt: string,
  keyLength: number,
  options: {
    N: number;
    r: number;
    p: number;
    maxmem?: number;
  }
) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      keyLength,
      {
        N: options.N,
        r: options.r,
        p: options.p,
        maxmem: options.maxmem ?? PASSWORD_SCRYPT_MAX_MEMORY
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      }
    );
  });
}

function parsePasswordHash(passwordHash: string): ParsedPasswordHash | null {
  const [prefix, rawN, rawR, rawP, salt, derivedKey] = passwordHash.split("$");

  if (
    prefix !== PASSWORD_HASH_PREFIX ||
    !rawN ||
    !rawR ||
    !rawP ||
    !salt ||
    !derivedKey ||
    salt.length === 0 ||
    derivedKey.length === 0 ||
    derivedKey.length % 2 !== 0
  ) {
    return null;
  }

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  const keyLength = derivedKey.length / 2;

  if (
    !Number.isInteger(N) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    !Number.isInteger(keyLength) ||
    N <= 1 ||
    r <= 0 ||
    p <= 0 ||
    keyLength <= 0
  ) {
    return null;
  }

  return {
    keyLength,
    salt,
    derivedKey,
    options: {
      N,
      r,
      p,
      maxmem: PASSWORD_SCRYPT_MAX_MEMORY
    }
  };
}

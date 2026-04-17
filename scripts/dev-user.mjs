import os from "node:os";
import { spawn } from "node:child_process";
import { validateWorkspace } from "./validate-workspace.mjs";
import { loadManifest, normalizePageId, parseArgs } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const manifest = loadManifest();
const port = Number(args.port || 5173);
const requestedPageId = normalizePageId(args.page);
const mode = requestedPageId || args.mode === "page" ? "page" : "app";
const enablePublicTunnel = args.public === "true";
const bindHost = args.host || "0.0.0.0";

function getLanIpv4Address() {
  const networkInterfaces = os.networkInterfaces();
  const preferredNames = ["WLAN", "Wi-Fi", "Wireless LAN adapter WLAN"];

  for (const name of preferredNames) {
    const entries = networkInterfaces[name] || [];
    const match = entries.find((entry) => entry.family === "IPv4" && !entry.internal);
    if (match) {
      return match.address;
    }
  }

  for (const entries of Object.values(networkInterfaces)) {
    const match = (entries || []).find((entry) => entry.family === "IPv4" && !entry.internal && entry.address.startsWith("192.168."));
    if (match) {
      return match.address;
    }
  }

  for (const entries of Object.values(networkInterfaces)) {
    const match = (entries || []).find((entry) => entry.family === "IPv4" && !entry.internal);
    if (match) {
      return match.address;
    }
  }

  return null;
}

if (requestedPageId && !manifest.some((entry) => entry.id === requestedPageId)) {
  console.error(`Page not found: ${requestedPageId}`);
  process.exit(1);
}

const workspaceErrors = validateWorkspace();
if (workspaceErrors.length > 0) {
  console.error("Preflight validation failed:");
  for (const error of workspaceErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const extraArgs = ["run", "dev", "--workspace", "@ihc/user-web", "--", "--host", bindHost, "--port", String(port)];
const localPreviewHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost;
const lanIpv4Address = getLanIpv4Address();
const previewUrl = requestedPageId
  ? `http://${localPreviewHost}:${port}/?mode=${mode}&page=${requestedPageId}`
  : `http://${localPreviewHost}:${port}/`;
const lanUrl = lanIpv4Address
  ? requestedPageId
    ? `http://${lanIpv4Address}:${port}/?mode=${mode}&page=${requestedPageId}`
    : `http://${lanIpv4Address}:${port}/`
  : null;

console.log(`Starting user web dev server: ${previewUrl}`);
if (mode === "page") {
  console.log(`Preview page: ${requestedPageId}`);
} else {
  console.log("Preview mode: full app");
}
console.log(`Local URL: ${previewUrl}`);
if (lanUrl) {
  console.log(`LAN URL: ${lanUrl}`);
} else {
  console.log("LAN URL: unavailable");
}

const child =
  process.platform === "win32"
    ? spawn(process.env.comspec || "cmd.exe", ["/d", "/s", "/c", "npm", ...extraArgs], {
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_IHC_MODE: mode,
          VITE_IHC_PAGE_ID: requestedPageId,
        },
      })
    : spawn("npm", extraArgs, {
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_IHC_MODE: mode,
          VITE_IHC_PAGE_ID: requestedPageId,
        },
      });

async function openPublicTunnel() {
  if (!enablePublicTunnel) {
    console.log("Public tunnel: disabled by default, pass --public true to enable");
    return;
  }
  console.log("Public tunnel is no longer started automatically. Use a dedicated tunnel tool if needed.");
}

void openPublicTunnel();

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`Dev server failed: ${error.message}`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

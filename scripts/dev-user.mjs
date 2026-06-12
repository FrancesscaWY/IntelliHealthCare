import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { resolveAppTarget } from "./app-targets.mjs";
import { validateWorkspace } from "./validate-workspace.mjs";
import { loadManifest, normalizePageId, parseArgs } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const appTarget = resolveAppTarget(args.app || "user");
const manifest = loadManifest(appTarget.key);
const requestedPort = Number(args.port || appTarget.defaultPort);
const requestedPageId = normalizePageId(args.page);
const mode = requestedPageId || args.mode === "page" ? "page" : "app";
const enablePublicTunnel = args.public === "true";
const bindHost = args.host || "0.0.0.0";
const allowPortFallback = args.portFallback === "true";

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

function canListenOnPort(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

function collectPortProbeHosts(bindHost, previewHost) {
  const hosts = new Set([bindHost]);

  if (previewHost) {
    hosts.add(previewHost);
  }

  if (bindHost === "0.0.0.0") {
    hosts.add("127.0.0.1");
  }

  return [...hosts];
}

async function canUsePortOnAllHosts(port, hosts) {
  for (const host of hosts) {
    const available = await canListenOnPort(port, host);
    if (!available) {
      return false;
    }
  }

  return true;
}

async function findAvailablePort(startPort, hosts, maxAttempts = 20) {
  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    const available = await canUsePortOnAllHosts(port, hosts);
    if (available) {
      return port;
    }
  }

  throw new Error(`No available port found between ${startPort} and ${startPort + maxAttempts - 1}`);
}

if (requestedPageId && !manifest.some((entry) => entry.id === requestedPageId)) {
  console.error(`Page not found: ${requestedPageId}`);
  process.exit(1);
}

const workspaceErrors = validateWorkspace(appTarget.key);
if (workspaceErrors.length > 0) {
  console.error("Preflight validation failed:");
  for (const error of workspaceErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const localPreviewHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost;
const portProbeHosts = collectPortProbeHosts(bindHost, localPreviewHost);
const requestedPortAvailable = await canUsePortOnAllHosts(requestedPort, portProbeHosts);

if (!requestedPortAvailable && !allowPortFallback) {
  console.error(`Port ${requestedPort} is already in use.`);
  console.error(`Stop the existing process or run with another port, for example: npm run dev:${appTarget.key} -- --port ${requestedPort + 1}`);
  console.error("If you explicitly want automatic port fallback, pass --portFallback true.");
  process.exit(1);
}

const port = requestedPortAvailable
  ? requestedPort
  : await findAvailablePort(requestedPort + 1, portProbeHosts);

if (port !== requestedPort) {
  console.warn(`Port ${requestedPort} is already in use, switched to ${port}.`);
}

const extraArgs = ["run", "dev", "--workspace", appTarget.packageName, "--", "--host", bindHost, "--port", String(port), "--strictPort"];
const lanIpv4Address = getLanIpv4Address();
const previewUrl = requestedPageId
  ? `http://${localPreviewHost}:${port}/?mode=${mode}&page=${requestedPageId}`
  : `http://${localPreviewHost}:${port}/`;
const lanUrl = lanIpv4Address
  ? requestedPageId
    ? `http://${lanIpv4Address}:${port}/?mode=${mode}&page=${requestedPageId}`
    : `http://${lanIpv4Address}:${port}/`
  : null;

console.log(`Starting ${appTarget.dirName} dev server: ${previewUrl}`);
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
          VITE_IHC_APP_KEY: appTarget.key,
        },
      })
    : spawn("npm", extraArgs, {
        detached: true,
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_IHC_MODE: mode,
          VITE_IHC_PAGE_ID: requestedPageId,
          VITE_IHC_APP_KEY: appTarget.key,
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

function terminateChild(signal = "SIGTERM") {
  if (child.exitCode !== null) {
    return;
  }

  if (process.platform !== "win32") {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall back to terminating only the direct child.
    }
  }

  child.kill(signal);
}

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`Dev server failed: ${error.message}`);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    terminateChild(signal);
  });
}

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageDir, "..", "..");
const require = createRequire(import.meta.url);
const electronBinary = require("electron");

let rendererProcess = null;
let electronProcess = null;
let restartTimer = null;
let shuttingDown = false;
let watchers = [];

function readArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

const requestedPort = readArgValue("--port");
const devPort = Number(requestedPort || process.env.IHC_USER_DESKTOP_PORT || 5184);
if (!Number.isInteger(devPort) || devPort < 1 || devPort > 65535) {
  throw new Error(`Invalid dev server port: ${requestedPort ?? process.env.IHC_USER_DESKTOP_PORT}`);
}

const devUrl = `http://127.0.0.1:${devPort}/`;

function spawnProcess(command, args, options) {
  return spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
}

async function waitForServer(url, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        return;
      }
    } catch {
      // Wait for the dev server to become available.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out while waiting for dev server: ${url}`);
}

function stopElectron(signal = "SIGTERM") {
  return new Promise((resolve) => {
    if (!electronProcess) {
      resolve();
      return;
    }

    const activeProcess = electronProcess;
    electronProcess = null;

    if (activeProcess.exitCode !== null) {
      resolve();
      return;
    }

    activeProcess.once("exit", () => resolve());
    activeProcess.kill(signal);
  });
}

function stopRenderer(signal = "SIGTERM") {
  return new Promise((resolve) => {
    if (!rendererProcess) {
      resolve();
      return;
    }

    const activeProcess = rendererProcess;
    rendererProcess = null;

    if (activeProcess.exitCode !== null) {
      resolve();
      return;
    }

    activeProcess.once("exit", () => resolve());
    activeProcess.kill(signal);
  });
}

function startElectron() {
  const child = spawnProcess(electronBinary, [path.join(packageDir, "main.mjs")], {
    cwd: packageDir,
    env: {
      ...process.env,
      IHC_DESKTOP_DEV_SERVER: devUrl,
    },
  });

  electronProcess = child;

  child.on("exit", (code, signal) => {
    if (electronProcess === child) {
      electronProcess = null;
    }

    if (shuttingDown || signal === "SIGTERM" || signal === "SIGINT") {
      return;
    }

    void shutdown().then(() => {
      process.exit(code ?? 0);
    });
  });
}

async function restartElectron() {
  await stopElectron();
  if (!shuttingDown) {
    startElectron();
  }
}

function scheduleElectronRestart() {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    void restartElectron();
  }, 150);
}

async function shutdown(signal = "SIGTERM") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }

  await stopElectron(signal);
  await stopRenderer(signal);

  for (const watcher of watchers) {
    watcher.close();
  }

  watchers = [];
}

const watchedFiles = [
  path.join(packageDir, "main.mjs"),
  path.join(packageDir, "preload.mjs"),
];

watchers = watchedFiles.map((filePath) =>
  fs.watch(filePath, () => {
    scheduleElectronRestart();
  })
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await shutdown(signal);
    process.exit(0);
  });
}

const rendererChild = spawnProcess(process.execPath, [path.join(repoRoot, "scripts", "dev-user.mjs"), "--app", "user", "--port", String(devPort)], {
  cwd: repoRoot,
  env: process.env,
});

rendererProcess = rendererChild;

rendererChild.on("exit", (code, signal) => {
  if (rendererProcess === rendererChild) {
    rendererProcess = null;
  }

  if (shuttingDown || signal === "SIGTERM" || signal === "SIGINT") {
    return;
  }

  void shutdown().then(() => {
    process.exit(code ?? 0);
  });
});

try {
  await waitForServer(devUrl);
  startElectron();
} catch (error) {
  await shutdown();
  throw error;
}

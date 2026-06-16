import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, "..");
const userWebDir = path.resolve(packageDir, "..", "user-web");
const desktopRendererDistDir = path.resolve(packageDir, "..", "..", "dist", "user-web-desktop");
const desktopDistDir = path.resolve(packageDir, "..", "..", "dist", "user-desktop");
const require = createRequire(import.meta.url);
const electronBuilderCli = require.resolve("electron-builder/out/cli/cli.js");
const configFile = path.join(packageDir, "electron-builder.config.cjs");
const builderArgs = process.argv.slice(2);
const isWindowsBuild =
  builderArgs.includes("--win") || builderArgs.some((arg) => arg === "win" || arg.startsWith("--win="));

function getRequestedWindowsTargets(args) {
  const targets = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--win" || arg === "win") {
      for (let nextIndex = index + 1; nextIndex < args.length; nextIndex += 1) {
        const candidate = args[nextIndex];

        if (candidate.startsWith("-")) {
          break;
        }

        targets.add(candidate);
      }

      continue;
    }

    if (arg.startsWith("--win=")) {
      for (const target of arg.slice("--win=".length).split(",")) {
        if (target) {
          targets.add(target);
        }
      }
    }
  }

  return targets;
}

const requestedWindowsTargets = getRequestedWindowsTargets(builderArgs);
const isWindowsInstallerBuild = requestedWindowsTargets.has("nsis");

if (isWindowsInstallerBuild && process.platform !== "win32") {
  throw new Error(
    `Windows NSIS installer packaging must be run on Windows. Current platform is ${process.platform}. ` +
      "Use npm run dist:user:desktop on Linux to produce a Windows zip archive instead."
  );
}

function run(command, args, cwd, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });

    child.on("error", reject);
  });
}

await run("npx", ["vite", "build"], userWebDir, {
  ...process.env,
  IHC_ASSET_BASE: "./",
  IHC_USER_WEB_OUT_DIR: desktopRendererDistDir,
  IHC_DESKTOP_RENDERER_DIR: desktopRendererDistDir,
});
await fs.rm(desktopDistDir, { recursive: true, force: true });

const effectiveBuilderArgs = [...builderArgs];

if (!effectiveBuilderArgs.includes("--config") && !effectiveBuilderArgs.some((arg) => arg.startsWith("--config="))) {
  effectiveBuilderArgs.push("--config", configFile);
}

if (!effectiveBuilderArgs.includes("--publish") && !effectiveBuilderArgs.some((arg) => arg.startsWith("--publish="))) {
  effectiveBuilderArgs.push("--publish", "never");
}

if (isWindowsBuild && process.platform !== "win32") {
  const targetHint =
    requestedWindowsTargets.size === 0 ? "default Windows target" : [...requestedWindowsTargets].join(", ");

  console.log(
    `[user-desktop] Building ${targetHint} on ${process.platform}. ` +
      "If Electron download is blocked, set IHC_ELECTRON_DIST to a directory or zip file path for electron-v31.7.7-win32-x64.zip."
  );
}

try {
  await run(process.execPath, [electronBuilderCli, ...effectiveBuilderArgs], packageDir);
} catch (error) {
  if (isWindowsBuild && process.platform !== "win32" && !process.env.IHC_ELECTRON_DIST) {
    throw new Error(
      `${error.message}\n` +
        "Windows zip packaging from Linux needs electron-v31.7.7-win32-x64.zip. " +
        "If automatic download fails, place that file locally and rerun with " +
        "IHC_ELECTRON_DIST=/path/to/electron-v31.7.7-win32-x64.zip npm run dist:user:desktop."
    );
  }

  throw error;
}

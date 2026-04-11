import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appConfigs } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const command = process.platform === "win32" ? "npm.cmd" : "npm";

const children = Object.values(appConfigs).map((appConfig) =>
  spawn(command, ["run", "dev", "-w", appConfig.workspace, "--", "--host", "--port", String(appConfig.port)], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  }),
);

function shutdown() {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

children.forEach((child) => {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
});


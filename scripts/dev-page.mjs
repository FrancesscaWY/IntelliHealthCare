import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAppConfig, normalizePageId, parseArgs } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const args = parseArgs(process.argv.slice(2));
const appId = args.app;
const pageId = normalizePageId(args.page);

if (!appId || !pageId) {
  console.error("用法：npm run dev:page -- --app user-mobile --page health-data/overview");
  process.exit(1);
}

const appConfig = getAppConfig(appId);
const command = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(
  command,
  ["run", "dev", "-w", appConfig.workspace, "--", "--host", "--port", String(appConfig.port)],
  {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_IHC_DEV_PAGE: pageId,
    },
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});


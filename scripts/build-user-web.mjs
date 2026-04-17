import { spawnSync } from "node:child_process";
import { resolveAppTarget } from "./app-targets.mjs";
import { parseArgs } from "./utils.mjs";
import { validateWorkspace } from "./validate-workspace.mjs";

const args = parseArgs(process.argv.slice(2));
const appTarget = resolveAppTarget(args.app || "user");
const errors = validateWorkspace(appTarget.key);

if (errors.length > 0) {
  console.error("构建前校验失败：");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const npmArgs = ["run", "build", "--workspace", appTarget.packageName];
const env = {
  ...process.env,
  VITE_IHC_MODE: "app",
  VITE_IHC_PAGE_ID: "",
  VITE_IHC_APP_KEY: appTarget.key,
};

const result =
  process.platform === "win32"
    ? spawnSync(process.env.comspec || "cmd.exe", ["/d", "/s", "/c", "npm", ...npmArgs], {
        stdio: "inherit",
        env,
      })
    : spawnSync("npm", npmArgs, {
        stdio: "inherit",
        env,
      });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

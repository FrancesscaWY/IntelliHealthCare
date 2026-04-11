import { spawnSync } from "node:child_process";
import { validateWorkspace } from "./validate-workspace.mjs";

const errors = validateWorkspace();
if (errors.length > 0) {
  console.error("构建前校验失败：");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const result =
  process.platform === "win32"
    ? spawnSync(process.env.comspec || "cmd.exe", ["/d", "/s", "/c", "npm", "run", "build", "--workspace", "@ihc/user-web"], {
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_IHC_MODE: "app",
          VITE_IHC_PAGE_ID: "",
        },
      })
    : spawnSync("npm", ["run", "build", "--workspace", "@ihc/user-web"], {
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_IHC_MODE: "app",
          VITE_IHC_PAGE_ID: "",
        },
      });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

import { spawn } from "node:child_process";
import { loadManifest, normalizePageId, parseArgs } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const manifest = loadManifest();
const port = Number(args.port || 5173);
const requestedPageId = normalizePageId(args.page);
const mode = requestedPageId || args.mode === "page" ? "page" : "app";

if (requestedPageId && !manifest.some((entry) => entry.id === requestedPageId)) {
  console.error(`未找到页面：${requestedPageId}`);
  process.exit(1);
}

const extraArgs = ["run", "dev", "--workspace", "@ihc/user-web", "--", "--host", "127.0.0.1", "--port", String(port)];
const previewUrl = requestedPageId
  ? `http://127.0.0.1:${port}/?mode=${mode}&page=${requestedPageId}`
  : `http://127.0.0.1:${port}/`;

console.log(`网页端开发服务启动中：${previewUrl}`);
if (mode === "page") {
  console.log(`单页预览：${requestedPageId}`);
} else {
  console.log("模式：整站预览");
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

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

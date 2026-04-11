import fs from "node:fs";
import path from "node:path";
import { appDir, copyDir, packageCoreDir, rootDir } from "./utils.mjs";
import { validateWorkspace } from "./validate-workspace.mjs";

const errors = validateWorkspace();
if (errors.length > 0) {
  console.error("构建前校验失败：");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const distDir = path.join(rootDir, "dist", "user-web");
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

copyDir(path.join(rootDir, "apps"), path.join(distDir, "apps"));
copyDir(path.join(rootDir, "packages"), path.join(distDir, "packages"));
copyDir(path.join(rootDir, "legacy"), path.join(distDir, "legacy"));

fs.copyFileSync(path.join(appDir, "index.html"), path.join(distDir, "index.html"));
fs.writeFileSync(
  path.join(distDir, "__ihc_config.js"),
  `window.__IHC_CONFIG__ = ${JSON.stringify({ mode: "app", pageId: "" })};\n`,
  "utf8",
);

console.log(`静态预览文件已输出到：${distDir}`);
console.log(`已包含目录：${packageCoreDir}`);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAppConfig, normalizePageId, parseArgs, resolvePageFolder } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const args = parseArgs(process.argv.slice(2));
const appId = args.app;
const pageId = normalizePageId(args.page);

if (!appId || !pageId) {
  console.error("用法：npm run prompt:page -- --app user-mobile --page health-data/overview");
  process.exit(1);
}

const appConfig = getAppConfig(appId);
const pageFolder = resolvePageFolder(rootDir, appId, pageId);
const specFile = path.join(pageFolder, "page.spec.json");
const mockFile = path.join(pageFolder, "page.mocks.ts");
const pageFile = path.join(pageFolder, "page.tsx");

if (!fs.existsSync(specFile)) {
  console.error(`找不到规范文件：${specFile}`);
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));

const prompt = [
  `请在 IntelliHealthCare 前端工作区内完成页面：${spec.title}（${pageId}）。`,
  ``,
  `上下文：`,
  `- 应用：${appConfig.displayName}（${appId}）`,
  `- 页面目录：${pageFolder}`,
  `- 规范文件：${specFile}`,
  `- mock 文件：${mockFile}`,
  `- 页面文件：${pageFile}`,
  ``,
  `必须遵守的约束：`,
  `1. 只修改当前页面目录及确有必要的应用样式文件，不要顺手改其他页面。`,
  `2. 默认导出必须保持 definePageModule({...}) 格式。`,
  `3. 页面必须支持 page.mocks.ts 中的 mock 场景独立预览。`,
  `4. 不要删除 spec 中的 id、route、owner、prototype 信息。`,
  `5. 如果需要共享能力，优先在当前页面内封装，避免直接耦合别人的页面。`,
  ``,
  `当前页面规范：`,
  JSON.stringify(spec, null, 2),
  ``,
  `完成后请使用下面命令验证：`,
  `- 单页：npm run dev:page -- --app ${appId} --page ${pageId}`,
  `- 集成：npm run dev${appId === "user-mobile" ? ":user" : ":admin"}`,
  ``,
  `输出要求：`,
  `- 保持 TypeScript 类型完整。`,
  `- 页面结构尽量贴近智慧养老业务语义。`,
  `- 如果原型细节不明确，先给出稳定的静态结构和 mock 数据展示。`,
].join("\n");

console.log(prompt);


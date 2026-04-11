import { requirePageEntry, parseArgs } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const pageId = args.page;

if (!pageId) {
  console.error("用法：npm run prompt:page -- --page health/health-data");
  process.exit(1);
}

const pageEntry = requirePageEntry(pageId);

const prompt = [
  `请在 IntelliHealthCare 的网页端工作区内完成页面：${pageEntry.title}（${pageEntry.id}）。`,
  "",
  "上下文：",
  `- 页面目录：${pageEntry.folderPath}`,
  `- 页面组件：${pageEntry.modulePath}`,
  `- mock 数据：${pageEntry.mockPath}`,
  `- 当前状态：${pageEntry.status}`,
  `- 负责人：${pageEntry.owner}`,
  "",
  "必须遵守的约束：",
  "1. 只修改当前页面目录以及确有必要的 packages/page-core 公共能力。",
  "2. 页面必须支持 npm run dev:page -- --page <page-id> 的单页调试。",
  "3. mock.ts 需要保留可独立预览的数据，不要把调试数据散落到全局。",
  "4. 页面还未接 API 时，优先完成稳定的静态结构和本地交互。",
  "5. 如果参考 legacy/miniprogram-user，请把它当成视觉和业务原型，不要反向污染新骨架。",
  "",
  "当前页面信息：",
  JSON.stringify(pageEntry, null, 2),
  "",
  "完成后请至少验证：",
  `- 单页：npm run dev:page -- --page ${pageEntry.id}`,
  "- 整站：npm run dev:user",
].join("\n");

console.log(prompt);

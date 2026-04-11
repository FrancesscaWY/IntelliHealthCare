import fs from "node:fs";
import path from "node:path";
import { buildPageEntry, loadManifest, normalizePageId, parseArgs, resolvePageFolder, saveManifest } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const group = args.group || args.module;
const pageName = args.page;
const title = args.title || "未命名页面";
const owner = args.owner || "待分配";
const summary = args.summary || "请根据原型补充页面职责说明。";

if (!group || !pageName) {
  console.error(
    "用法：npm run create:page -- --group health --page health-data --title \"健康数据\" --owner \"成员A\"",
  );
  process.exit(1);
}

const pageId = normalizePageId(`${group}/${pageName}`);
const pageFolder = resolvePageFolder(pageId);
const escapedGroup = JSON.stringify(group.toUpperCase());
const escapedTitle = JSON.stringify(title);

if (fs.existsSync(pageFolder)) {
  console.error(`页面目录已存在：${pageFolder}`);
  process.exit(1);
}

fs.mkdirSync(pageFolder, { recursive: true });

fs.writeFileSync(
  path.join(pageFolder, "mock.js"),
  [
    "export default {",
    `  title: ${JSON.stringify(title)},`,
    `  summary: ${JSON.stringify(summary)},`,
    "  sections: [],",
    "};",
    "",
  ].join("\n"),
  "utf8",
);

fs.writeFileSync(
  path.join(pageFolder, "page.js"),
  [
    'import mock from "./mock.js";',
    'import { createPlaceholderMarkup } from "/packages/page-core/src/runtime.js";',
    "",
    "export const styles = `",
    "",
    "`;",
    "",
    "export function mount({ root }) {",
    "  root.innerHTML = createPlaceholderMarkup({",
    `    group: ${escapedGroup},`,
    `    title: ${escapedTitle},`,
    "    summary: mock.summary,",
    "  });",
    "}",
    "",
  ].join("\n"),
  "utf8",
);

fs.writeFileSync(
  path.join(pageFolder, "README.md"),
  [
    `# ${title}`,
    "",
    `- 页面 id：\`${pageId}\``,
    `- 页面目录：\`apps/user-web/src/pages/${pageId}\``,
    `- 负责人：${owner}`,
    "",
    "开发约定：",
    "- 在 `page.js` 中编写页面结构和交互。",
    "- 在 `mock.js` 中维护单页调试数据。",
    "- 如果需要复用能力，优先抽到 `packages/page-core`。",
    "",
  ].join("\n"),
  "utf8",
);

const manifest = loadManifest();
manifest.push(
  buildPageEntry({
    id: pageId,
    title,
    group,
    summary,
    owner,
  }),
);
saveManifest(manifest);

console.log(`已创建页面：${pageFolder}`);

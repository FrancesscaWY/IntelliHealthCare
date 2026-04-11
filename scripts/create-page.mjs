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
  console.error('用法：npm run create:page -- --group health --page health-data --title "健康数据" --owner "成员A"');
  process.exit(1);
}

const pageId = normalizePageId(`${group}/${pageName}`);
const pageFolder = resolvePageFolder(pageId);

if (fs.existsSync(pageFolder)) {
  console.error(`页面目录已存在：${pageFolder}`);
  process.exit(1);
}

fs.mkdirSync(pageFolder, { recursive: true });

fs.writeFileSync(
  path.join(pageFolder, "mock.ts"),
  [
    "const mock = {",
    `  title: ${JSON.stringify(title)},`,
    `  summary: ${JSON.stringify(summary)},`,
    "  sections: [],",
    "};",
    "",
    "export default mock;",
    "",
  ].join("\n"),
  "utf8",
);

fs.writeFileSync(
  path.join(pageFolder, "Page.vue"),
  [
    "<script setup lang=\"ts\">",
    'import PagePlaceholder from "@/components/PagePlaceholder.vue";',
    'import mock from "./mock";',
    "",
    "const pageEntry = {",
    `  id: ${JSON.stringify(pageId)},`,
    `  title: ${JSON.stringify(title)},`,
    `  group: ${JSON.stringify(group)},`,
    `  route: ${JSON.stringify(`/${pageId}`)},`,
    `  owner: ${JSON.stringify(owner)},`,
    '  status: "planned",',
    "  summary: mock.summary,",
    `  folderPath: ${JSON.stringify(`/apps/user-web/src/pages/${pageId}`)},`,
    `  modulePath: ${JSON.stringify(`/apps/user-web/src/pages/${pageId}/Page.vue`)},`,
    `  mockPath: ${JSON.stringify(`/apps/user-web/src/pages/${pageId}/mock.ts`)},`,
    "  legacySources: [],",
    "};",
    "</script>",
    "",
    "<template>",
    "  <PagePlaceholder :page-entry=\"pageEntry\" />",
    "</template>",
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
    "- 在 `Page.vue` 中编写页面结构和交互。",
    "- 在 `mock.ts` 中维护单页调试数据。",
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

import fs from "node:fs";
import path from "node:path";
import { resolveAppTarget } from "./app-targets.mjs";
import {
  DEFAULT_PAGE_SUMMARY,
  buildPageEntry,
  loadManifest,
  normalizePageId,
  parseArgs,
  resolvePageFolder,
  saveManifest,
} from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const appTarget = resolveAppTarget(args.app || "user");
const group = args.group || args.module;
const pageName = args.page;
const title = args.title || "未命名页面";
const owner = args.owner || "待分配";
const summary = args.summary || DEFAULT_PAGE_SUMMARY;
const shouldCreateReadme = args["with-readme"] === "true";

if (!group || !pageName) {
  console.error('用法：npm run create:page -- --group health --page health-data --title "健康数据" --owner "成员A"');
  process.exit(1);
}

const pageId = normalizePageId(`${group}/${pageName}`);
const pageFolder = resolvePageFolder(appTarget.key, pageId);

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
    "  actions: [],",
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
    'import type { PageComponentProps } from "@ihc/page-core/types";',
    'import mock from "./mock";',
    "",
    "const props = defineProps<PageComponentProps>();",
    "</script>",
    "",
    "<template>",
    '  <section class="page-shell">',
    "    <header>",
    "      <p>{{ props.pageEntry.group }}</p>",
    "      <h1>{{ mock.title }}</h1>",
    "      <span>{{ props.pageEntry.status }}</span>",
    "    </header>",
    "    <p>{{ mock.summary }}</p>",
    "  </section>",
    "</template>",
    "",
    "<style scoped>",
    ".page-shell {",
    "  display: grid;",
    "  gap: 12px;",
    "  padding: 20px;",
    "  border-radius: 20px;",
    "  background: rgba(255, 255, 255, 0.96);",
    "  box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);",
    "}",
    "",
    ".page-shell header {",
    "  display: grid;",
    "  gap: 4px;",
    "}",
    "",
    ".page-shell p {",
    "  margin: 0;",
    "  color: var(--muted);",
    "  line-height: 1.7;",
    "}",
    "</style>",
    "",
  ].join("\n"),
  "utf8",
);

if (shouldCreateReadme) {
  fs.writeFileSync(
    path.join(pageFolder, "README.md"),
    [
      `# ${title}`,
      "",
      `- 页面 id：\`${pageId}\``,
      `- 页面目录：\`apps/${appTarget.dirName}/src/pages/${pageId}\``,
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
}

const manifest = loadManifest(appTarget.key);
manifest.push(
  buildPageEntry({
    app: appTarget.key,
    id: pageId,
    title,
    group,
    summary,
    owner,
  }),
);
saveManifest(appTarget.key, manifest);

console.log(`已创建页面：${pageFolder}`);

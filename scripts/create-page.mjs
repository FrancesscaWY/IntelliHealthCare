import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAppConfig, normalizePageId, parseArgs, resolvePageFolder } from "./utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const args = parseArgs(process.argv.slice(2));

const appId = args.app;
const moduleName = args.module;
const pageName = args.page;
const title = args.title || "未命名页面";
const owner = args.owner || "待分配";
const route = args.route || `/${moduleName}/${pageName}`;

if (!appId || !moduleName || !pageName) {
  console.error(
    "用法：npm run create:page -- --app user-mobile --module service-order --page list --title \"服务下单列表\" --owner \"张三\"",
  );
  process.exit(1);
}

getAppConfig(appId);

const pageId = normalizePageId(`${moduleName}/${pageName}`);
const pageFolder = resolvePageFolder(rootDir, appId, pageId);

if (fs.existsSync(pageFolder)) {
  console.error(`页面目录已存在：${pageFolder}`);
  process.exit(1);
}

fs.mkdirSync(pageFolder, { recursive: true });

const spec = {
  id: pageId,
  app: appId,
  module: moduleName,
  route,
  title,
  navLabel: title,
  description: "请根据原型补充页面描述。",
  owner,
  status: "planned",
  prototype: {
    reference: "请补充原型链接或页面编号",
    notes: ["请补充关键交互说明"],
  },
};

fs.writeFileSync(path.join(pageFolder, "page.spec.json"), `${JSON.stringify(spec, null, 2)}\n`, "utf8");

fs.writeFileSync(
  path.join(pageFolder, "page.mocks.ts"),
  [
    'import type { MockScenario } from "@ihc/page-core";',
    "",
    "export interface GeneratedPageMock {",
    "  title: string;",
    "  summary: string;",
    "}",
    "",
    "export const generatedPageScenes: MockScenario<GeneratedPageMock>[] = [",
    "  {",
    '    id: "default",',
    '    label: "默认场景",',
    '    description: "用于单页联调的基础场景。",',
    "    data: {",
    `      title: "${title}",`,
    '      summary: "请根据页面业务补充 mock 数据。",',
    "    },",
    "  },",
    "];",
    "",
  ].join("\n"),
  "utf8",
);

fs.writeFileSync(
  path.join(pageFolder, "page.tsx"),
  [
    'import { definePageModule, type PageRenderContext } from "@ihc/page-core";',
    'import spec from "./page.spec.json";',
    'import { generatedPageScenes, type GeneratedPageMock } from "./page.mocks";',
    "",
    "function GeneratedPage({ scene, mode }: PageRenderContext<GeneratedPageMock>) {",
    "  return (",
    '    <section className=\"page-card\">',
    "      <header>",
    "        <p className=\"eyebrow\">{mode === \"page\" ? \"单页预览\" : \"集成预览\"}</p>",
    "        <h1>{scene.data.title}</h1>",
    "      </header>",
    "      <p>{scene.data.summary}</p>",
    "    </section>",
    "  );",
    "}",
    "",
    "export default definePageModule({",
    "  spec,",
    "  scenes: generatedPageScenes,",
    "  Component: GeneratedPage,",
    "});",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`已创建页面：${pageFolder}`);


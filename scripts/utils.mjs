import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAppTarget } from "./app-targets.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, "..");
export const packageCoreDir = path.join(rootDir, "packages", "page-core");
export const DEFAULT_PAGE_SUMMARY = "请根据原型补充页面职责说明。";

export function getAppPaths(appArg = "user") {
  const target = resolveAppTarget(appArg);
  const appDir = path.join(rootDir, "apps", target.dirName);
  const appSrcDir = path.join(appDir, "src");

  return {
    target,
    appDir,
    appSrcDir,
    pagesDir: path.join(appSrcDir, "pages"),
    manifestPath: path.join(appSrcDir, "app", "pages.manifest.json"),
    appIndexPath: path.join(appDir, "index.html"),
  };
}

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    args[key] = value && !value.startsWith("--") ? value : "true";
  }

  return args;
}

export function normalizePageId(rawPageId) {
  return String(rawPageId || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function loadManifest(appArg = "user") {
  return JSON.parse(fs.readFileSync(getAppPaths(appArg).manifestPath, "utf8"));
}

export function saveManifest(appArg, manifest) {
  const { manifestPath } = getAppPaths(appArg);
  const sorted = [...manifest].sort((left, right) => left.id.localeCompare(right.id, "zh-CN"));
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

export function resolvePageFolder(appArg, pageId) {
  const { pagesDir } = getAppPaths(appArg);
  return path.join(pagesDir, ...normalizePageId(pageId).split("/"));
}

export function getPageEntry(appArg, pageId) {
  const normalizedPageId = normalizePageId(pageId);
  return loadManifest(appArg).find((entry) => entry.id === normalizedPageId);
}

export function ensureTrackedDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function copyDir(sourceDir, targetDir) {
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
  });
}

export function buildPageEntry({
  app = "user",
  id,
  title,
  group,
  summary,
  owner,
  status = "implemented",
}) {
  const { target } = getAppPaths(app);
  const normalizedId = normalizePageId(id);
  const baseFolder = `/apps/${target.dirName}/src/pages/${normalizedId}`;

  return {
    id: normalizedId,
    title,
    group,
    route: `/${normalizedId}`,
    owner: owner || "待分配",
    status,
    summary: summary || DEFAULT_PAGE_SUMMARY,
    folderPath: baseFolder,
    modulePath: `${baseFolder}/Page.vue`,
    mockPath: `${baseFolder}/mock.ts`,
    legacySources: [],
  };
}

export function requirePageEntry(appArg, pageId) {
  const pageEntry = getPageEntry(appArg, pageId);

  if (!pageEntry) {
    throw new Error(`未在 pages.manifest.json 中登记页面：${normalizePageId(pageId)}`);
  }

  return pageEntry;
}

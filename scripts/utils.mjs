import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, "..");
export const appDir = path.join(rootDir, "apps", "user-web");
export const appSrcDir = path.join(appDir, "src");
export const pagesDir = path.join(appSrcDir, "pages");
export const manifestPath = path.join(appSrcDir, "app", "pages.manifest.json");
export const appIndexPath = path.join(appDir, "index.html");
export const packageCoreDir = path.join(rootDir, "packages", "page-core");
export const legacyDir = path.join(rootDir, "legacy", "miniprogram-user");

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
  return (rawPageId || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

export function saveManifest(manifest) {
  const sorted = [...manifest].sort((left, right) => left.id.localeCompare(right.id, "zh-CN"));
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

export function resolvePageFolder(pageId) {
  return path.join(pagesDir, ...normalizePageId(pageId).split("/"));
}

export function getPageEntry(pageId) {
  const normalizedPageId = normalizePageId(pageId);
  return loadManifest().find((entry) => entry.id === normalizedPageId);
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
  id,
  title,
  group,
  summary,
  owner,
  status = "planned",
}) {
  const normalizedId = normalizePageId(id);

  return {
    id: normalizedId,
    title,
    group,
    route: `/${normalizedId}`,
    owner: owner || "待分配",
    status,
    summary: summary || "待补充页面职责说明。",
    folderPath: `/apps/user-web/src/pages/${normalizedId}`,
    modulePath: `/apps/user-web/src/pages/${normalizedId}/page.js`,
    mockPath: `/apps/user-web/src/pages/${normalizedId}/mock.js`,
    legacySources: [],
  };
}

export function requirePageEntry(pageId) {
  const pageEntry = getPageEntry(pageId);

  if (!pageEntry) {
    throw new Error(`未在 pages.manifest.json 中登记页面：${normalizePageId(pageId)}`);
  }

  return pageEntry;
}

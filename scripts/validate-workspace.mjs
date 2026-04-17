import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listAppTargets, resolveAppTarget } from "./app-targets.mjs";
import { loadManifest, resolvePageFolder, rootDir } from "./utils.mjs";

function validateAppWorkspace(appTarget) {
  const manifest = loadManifest(appTarget.key);
  const errors = [];
  const seenIds = new Set();

  for (const entry of manifest) {
    if (seenIds.has(entry.id)) {
      errors.push(`页面重复登记：${entry.id}`);
      continue;
    }
    seenIds.add(entry.id);

    const folderPath = resolvePageFolder(appTarget.key, entry.id);
    if (!fs.existsSync(folderPath)) {
      errors.push(`页面目录不存在：${entry.id} -> ${folderPath}`);
      continue;
    }

    const readmePath = path.join(folderPath, "README.md");
    const pageFilePath = path.join(folderPath, "Page.vue");
    const mockFilePath = path.join(folderPath, "mock.ts");

    if (entry.status === "implemented") {
      if (!fs.existsSync(pageFilePath)) {
        errors.push(`已实现页面缺少 Page.vue：${entry.id}`);
      }

      if (!fs.existsSync(mockFilePath)) {
        errors.push(`已实现页面缺少 mock.ts：${entry.id}`);
      }
    } else if (!fs.existsSync(readmePath) && !fs.existsSync(pageFilePath)) {
      errors.push(`规划页面至少需要 README.md 或 Page.vue：${entry.id}`);
    }
  }

  if (appTarget.referenceMode === "legacy") {
    const legacyPath = path.join(rootDir, "legacy", "miniprogram-user");
    if (!fs.existsSync(legacyPath)) {
      errors.push("缺少 legacy/miniprogram-user，无法保留现有小程序参考代码。");
    }
  }

  return errors;
}

export function validateWorkspace(appArg) {
  if (appArg) {
    return validateAppWorkspace(resolveAppTarget(appArg));
  }

  return listAppTargets().flatMap((target) =>
    validateAppWorkspace(target).map((error) => `[${target.key}] ${error}`),
  );
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const appIndex = process.argv.findIndex((token) => token === "--app");
  const appArg = appIndex >= 0 ? process.argv[appIndex + 1] : undefined;
  const errors = validateWorkspace(appArg);

  if (errors.length > 0) {
    console.error("工作区校验失败：");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("工作区结构校验通过。");
}

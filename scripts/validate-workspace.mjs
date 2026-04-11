import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadManifest, resolvePageFolder, rootDir } from "./utils.mjs";

export function validateWorkspace() {
  const manifest = loadManifest();
  const errors = [];
  const seenIds = new Set();

  for (const entry of manifest) {
    if (seenIds.has(entry.id)) {
      errors.push(`页面重复登记：${entry.id}`);
      continue;
    }
    seenIds.add(entry.id);

    const folderPath = resolvePageFolder(entry.id);
    if (!fs.existsSync(folderPath)) {
      errors.push(`页面目录不存在：${entry.id} -> ${folderPath}`);
      continue;
    }

    const readmePath = path.join(folderPath, "README.md");
    const pageFilePath = path.join(folderPath, "page.js");
    const mockFilePath = path.join(folderPath, "mock.js");

    if (entry.status === "implemented") {
      if (!fs.existsSync(pageFilePath)) {
        errors.push(`已实现页面缺少 page.js：${entry.id}`);
      }

      if (!fs.existsSync(mockFilePath)) {
        errors.push(`已实现页面缺少 mock.js：${entry.id}`);
      }
    } else if (!fs.existsSync(readmePath) && !fs.existsSync(pageFilePath)) {
      errors.push(`规划页面至少需要 README.md 或 page.js：${entry.id}`);
    }
  }

  const legacyPath = path.join(rootDir, "legacy", "miniprogram-user");
  if (!fs.existsSync(legacyPath)) {
    errors.push("缺少 legacy/miniprogram-user，无法保留现有小程序实现。");
  }

  return errors;
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const errors = validateWorkspace();

  if (errors.length > 0) {
    console.error("工作区校验失败：");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("工作区结构校验通过。");
}

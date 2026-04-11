import path from "node:path";

export const appConfigs = {
  "user-mobile": {
    appId: "user-mobile",
    workspace: "@ihc/user-mobile",
    folder: "apps/user-mobile",
    port: 5173,
    displayName: "用户端",
  },
  "admin-console": {
    appId: "admin-console",
    workspace: "@ihc/admin-console",
    folder: "apps/admin-console",
    port: 5174,
    displayName: "后台端",
  },
};

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

export function getAppConfig(appId) {
  const config = appConfigs[appId];

  if (!config) {
    throw new Error(`不支持的 app：${appId}。可选值：${Object.keys(appConfigs).join(", ")}`);
  }

  return config;
}

export function normalizePageId(rawPageId) {
  return (rawPageId || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

export function resolvePageFolder(rootDir, appId, pageId) {
  const config = getAppConfig(appId);
  return path.join(rootDir, config.folder, "src", "pages", ...normalizePageId(pageId).split("/"));
}


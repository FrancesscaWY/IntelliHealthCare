export const APP_TARGETS = {
  user: {
    key: "user",
    dirName: "user-web",
    packageName: "@ihc/user-web",
    displayName: "IntelliHealthCare APP端",
    distDirName: "user-web",
    defaultPort: 5173,
    defaultHomePageId: "onboarding/intro",
  },
  admin: {
    key: "admin",
    dirName: "admin-web",
    packageName: "@ihc/admin-web",
    displayName: "IntelliHealthCare 后台端",
    distDirName: "admin-web",
    defaultPort: 5174,
    defaultHomePageId: "dashboard/overview",
  },
};

const APP_ALIASES = new Map(
  Object.values(APP_TARGETS).flatMap((target) => [
    [target.key, target.key],
    [target.dirName, target.key],
    [target.packageName, target.key],
  ]),
);

export function resolveAppTarget(appArg = "user") {
  const normalized = String(appArg || "user");
  const resolvedKey = APP_ALIASES.get(normalized);

  if (!resolvedKey) {
    throw new Error(`Unknown app target: ${normalized}`);
  }

  return APP_TARGETS[resolvedKey];
}

export function listAppTargets() {
  return Object.values(APP_TARGETS);
}

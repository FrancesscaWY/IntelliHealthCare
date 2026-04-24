import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

function hasBackendWorkspaceMarkers(candidate: string) {
  return existsSync(join(candidate, "prisma", "schema.prisma"));
}

export function resolveBackendRoot(
  cwd = process.cwd(),
  currentDir = __dirname
) {
  const candidates = [
    resolve(cwd, "apps", "backend"),
    cwd,
    resolve(currentDir, "..", "..", "..")
  ];

  for (const candidate of candidates) {
    if (hasBackendWorkspaceMarkers(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve apps/backend workspace root.");
}

export function resolveBackendPublicDir(
  cwd = process.cwd(),
  currentDir = __dirname
) {
  const backendRoot = resolveBackendRoot(cwd, currentDir);
  const publicDir = join(backendRoot, "public");

  if (!existsSync(publicDir)) {
    throw new Error(`Unable to resolve backend public assets directory: ${publicDir}`);
  }

  return publicDir;
}

export function resolveBackendEnvFilePaths(
  cwd = process.cwd(),
  currentDir = __dirname
) {
  const backendRoot = resolveBackendRoot(cwd, currentDir);
  const repoRoot = resolve(backendRoot, "..", "..");

  return Array.from(
    new Set([
      join(backendRoot, ".env"),
      join(repoRoot, ".env"),
      join(resolve(currentDir, "..", "..", ".."), ".env")
    ])
  );
}

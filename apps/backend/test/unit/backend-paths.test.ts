import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import {
  resolveBackendEnvFilePaths,
  resolveBackendPublicDir,
  resolveBackendRoot
} from "../../src/common/utils/backend-paths";

const backendRoot = process.cwd();
const repoRoot = resolve(backendRoot, "..", "..");
const sourceUtilsDir = resolve(backendRoot, "src", "common", "utils");

test("resolveBackendRoot works from repository root", () => {
  assert.equal(resolveBackendRoot(repoRoot, sourceUtilsDir), backendRoot);
});

test("resolveBackendRoot works from backend workspace root", () => {
  assert.equal(resolveBackendRoot(backendRoot, sourceUtilsDir), backendRoot);
});

test("resolveBackendPublicDir resolves the public assets directory", () => {
  assert.equal(
    resolveBackendPublicDir(backendRoot, sourceUtilsDir),
    resolve(backendRoot, "public")
  );
});

test("resolveBackendEnvFilePaths includes backend and repository env files", () => {
  const envFilePaths = resolveBackendEnvFilePaths(backendRoot, sourceUtilsDir);

  assert.ok(envFilePaths.includes(resolve(backendRoot, ".env")));
  assert.ok(envFilePaths.includes(resolve(repoRoot, ".env")));
});

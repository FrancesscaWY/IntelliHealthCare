import assert from "node:assert/strict";
import test from "node:test";
import {
  LEGACY_DEMO_PASSWORD,
  hashPassword,
  isSecurePasswordHash,
  resolveLegacyPassword,
  verifyPassword
} from "../../src/common/auth/password";

test("hashPassword produces a verifiable scrypt hash", async () => {
  const passwordHash = await hashPassword("123456");

  assert.equal(isSecurePasswordHash(passwordHash), true);
  assert.equal(await verifyPassword(passwordHash, "123456"), true);
  assert.equal(await verifyPassword(passwordHash, "654321"), false);
});

test("resolveLegacyPassword supports demo and plain-text records", () => {
  assert.equal(resolveLegacyPassword("demo_hash_admin"), LEGACY_DEMO_PASSWORD);
  assert.equal(resolveLegacyPassword("plain-password"), "plain-password");
  assert.equal(resolveLegacyPassword("bcrypt$unsupported"), null);
});

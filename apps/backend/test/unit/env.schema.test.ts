import assert from "node:assert/strict";
import test from "node:test";
import { validateEnv } from "../../src/common/config/env.schema";

const baseConfig = {
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/ihc",
  REDIS_URL: "redis://127.0.0.1:6379",
  JWT_ACCESS_SECRET: "1234567890abcdef",
  JWT_REFRESH_SECRET: "abcdef1234567890"
};

test("validateEnv restores the default DeepSeek base URL when the env file leaves it blank", () => {
  const env = validateEnv({
    ...baseConfig,
    AGENT_LLM_PROVIDER: "deepseek",
    AGENT_LLM_BASE_URL: "",
    AGENT_LLM_API_KEY: "",
    DEEPSEEK_API_KEY: "sk-test"
  });

  assert.equal(env.AGENT_LLM_BASE_URL, "https://api.deepseek.com");
  assert.equal(env.AGENT_LLM_API_KEY, "sk-test");
  assert.equal(env.AGENT_EMBEDDING_BASE_URL, "https://api.deepseek.com");
  assert.equal(env.AGENT_EMBEDDING_API_KEY, "sk-test");
});

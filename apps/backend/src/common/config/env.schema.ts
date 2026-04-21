import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .optional()
  .default("false")
  .transform((value) => value === "true");

const booleanStringTrue = z
  .enum(["true", "false"])
  .optional()
  .default("true")
  .transform((value) => value === "true");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(8190),
  APP_NAME: z.string().min(1).default("IntelliHealthCare Backend"),
  API_PREFIX: z.string().min(1).default("api/v1"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174"),
  DATABASE_URL: z.string().min(1),
  DATABASE_DEV_FALLBACK_ENABLED: booleanStringTrue,
  DATABASE_DEV_FALLBACK_AUTO_SEED: booleanStringTrue,
  DATABASE_DEV_FALLBACK_HOST: z.string().min(1).default("127.0.0.1"),
  DATABASE_DEV_FALLBACK_DIR: z.string().min(1).default(".local/embedded-postgres"),
  DATABASE_DEV_FALLBACK_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(100).default(20),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().min(1).default("2h"),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string().min(1).default("30d"),
  MINIO_ENDPOINT: z.string().min(1).default("localhost"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: booleanString,
  MINIO_ACCESS_KEY: z.string().min(1).default("minioadmin"),
  MINIO_SECRET_KEY: z.string().min(1).default("minioadmin"),
  MINIO_BUCKET: z.string().min(1).default("ihc-files"),
  AGENT_RAG_COLLECTION: z.string().min(1).default("ihc-rag"),
  AGENT_LLM_PROVIDER: z
    .enum(["mock", "openrouter", "openai-compatible"])
    .default("openrouter"),
  AGENT_LLM_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  AGENT_LLM_API_KEY: z.string().default(""),
  AGENT_LLM_MODEL: z.string().min(1).default("deepseek/deepseek-v3.2"),
  AGENT_LLM_LIGHT_MODEL: z
    .string()
    .min(1)
    .default("qwen/qwen3-30b-a3b-instruct-2507"),
  AGENT_LLM_FALLBACK_MODEL: z
    .string()
    .min(1)
    .default("qwen/qwen3-30b-a3b-instruct-2507"),
  AGENT_EMBEDDING_MODEL: z
    .string()
    .min(1)
    .default("qwen/qwen3-embedding-8b"),
  AGENT_EMBEDDING_FALLBACK_MODEL: z.string().min(1).default("baai/bge-m3"),
  AGENT_LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  AGENT_EMBEDDING_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AGENT_LLM_MAX_CONTEXT_TOKENS: z.coerce.number().int().positive().default(131072),
  AGENT_TASK_BUDGET_USD: z.coerce.number().positive().default(0.05),
  AGENT_STRICT_JSON_OUTPUT: booleanStringTrue,
  AGENT_REQUIRE_TOOL_CALLING: booleanStringTrue,
  AGENT_OPENROUTER_ALLOW_FALLBACKS: booleanStringTrue,
  AGENT_OPENROUTER_ZDR: booleanStringTrue,
  AGENT_MAX_RETRIES: z.coerce.number().int().min(1).max(5).default(2),
  AGENT_MAX_TOOL_STEPS: z.coerce.number().int().min(1).max(8).default(4),
  AGENT_ENABLE_TRACING: booleanStringTrue,
  AGENT_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3)
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}

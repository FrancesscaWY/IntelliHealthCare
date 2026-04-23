import { Logger } from "@nestjs/common";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { config as loadDotEnv } from "dotenv";
import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";

const execFileAsync = promisify(execFile);
const DEFAULT_DEVELOPMENT_DATABASE_URL =
  "postgresql://ihc:ihc123456@localhost:5432/ihc_backend?schema=public";
const DEFAULT_EMBEDDED_DATABASE_DIR = ".local/embedded-postgres";
const DEFAULT_EMBEDDED_HOST = "127.0.0.1";
const DEFAULT_EMBEDDED_MAX_CONNECTIONS = 20;
const DATABASE_CONNECT_TIMEOUT_MS = 1_500;
const PROCESS_OUTPUT_BUFFER_SIZE = 20 * 1024 * 1024;

type ChildProcessError = NodeJS.ErrnoException & {
  stdout?: string;
  stderr?: string;
};

export interface DatabaseBootstrapResult {
  cleanup(): Promise<void>;
  databaseUrl: string;
  usingEmbeddedDatabase: boolean;
}

export async function bootstrapDatabase(logger: Logger): Promise<DatabaseBootstrapResult> {
  loadBackendEnvFiles();

  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (!process.env.DATABASE_URL?.trim()) {
    if (nodeEnv !== "development") {
      throw new Error("DATABASE_URL is required");
    }

    process.env.DATABASE_URL = DEFAULT_DEVELOPMENT_DATABASE_URL;
  }

  const configuredDatabaseUrl = process.env.DATABASE_URL;

  if (!configuredDatabaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!shouldUseEmbeddedDatabaseFallback(nodeEnv)) {
    return {
      cleanup: async () => undefined,
      databaseUrl: configuredDatabaseUrl,
      usingEmbeddedDatabase: false,
    };
  }

  if (await canConnectToDatabase(configuredDatabaseUrl)) {
    logger.log(`Using configured PostgreSQL instance at ${sanitizeDatabaseUrl(configuredDatabaseUrl)}.`);

    return {
      cleanup: async () => undefined,
      databaseUrl: configuredDatabaseUrl,
      usingEmbeddedDatabase: false,
    };
  }

  logger.warn(
    `Database ${sanitizeDatabaseUrl(configuredDatabaseUrl)} is unreachable. Starting embedded development PostgreSQL.`
  );

  const embeddedDatabase = await startEmbeddedDatabase(configuredDatabaseUrl, logger);

  process.env.DATABASE_URL = embeddedDatabase.databaseUrl;

  await prepareSchema(process.env.DATABASE_URL, logger);

  if (shouldAutoSeedEmbeddedDatabase()) {
    await seedDatabaseIfEmpty(process.env.DATABASE_URL, logger);
  }

  return {
    cleanup: embeddedDatabase.cleanup,
    databaseUrl: process.env.DATABASE_URL,
    usingEmbeddedDatabase: true,
  };
}

function loadBackendEnvFiles() {
  for (const envFilePath of getEnvFilePaths()) {
    if (!existsSync(envFilePath)) {
      continue;
    }

    loadDotEnv({
      path: envFilePath,
      override: false,
    });
  }
}

function getEnvFilePaths() {
  const backendRoot = getBackendRoot();
  const repoRoot = getRepoRoot(backendRoot);

  return [join(backendRoot, ".env"), join(repoRoot, ".env"), join(resolve(__dirname, "..", "..", ".."), ".env")];
}

function shouldUseEmbeddedDatabaseFallback(nodeEnv: string) {
  if (nodeEnv !== "development") {
    return false;
  }

  return parseBoolean(process.env.DATABASE_DEV_FALLBACK_ENABLED, true);
}

function shouldAutoSeedEmbeddedDatabase() {
  return parseBoolean(process.env.DATABASE_DEV_FALLBACK_AUTO_SEED, true);
}

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

async function canConnectToDatabase(databaseUrl: string) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: DATABASE_CONNECT_TIMEOUT_MS,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function startEmbeddedDatabase(databaseUrl: string, logger: Logger) {
  const backendRoot = getBackendRoot();
  const databaseDir = resolveEmbeddedDatabaseDir(backendRoot);

  await mkdir(dirname(databaseDir), { recursive: true });

  const db = new PGlite(databaseDir);
  await db.waitReady;

  const host = process.env.DATABASE_DEV_FALLBACK_HOST?.trim() || DEFAULT_EMBEDDED_HOST;
  const server = new PGLiteSocketServer({
    db,
    host,
    port: 0,
    maxConnections: parsePositiveInt(
      process.env.DATABASE_DEV_FALLBACK_MAX_CONNECTIONS,
      DEFAULT_EMBEDDED_MAX_CONNECTIONS
    ),
  });

  await server.start();

  const serverConnection = server.getServerConn();
  const portSeparatorIndex = serverConnection.lastIndexOf(":");

  if (portSeparatorIndex === -1) {
    throw new Error(`Unexpected embedded database server address: ${serverConnection}`);
  }

  const embeddedDatabaseUrl = buildEmbeddedDatabaseUrl(
    databaseUrl,
    serverConnection.slice(0, portSeparatorIndex),
    serverConnection.slice(portSeparatorIndex + 1)
  );

  logger.log(`Embedded PostgreSQL is listening at ${serverConnection} with data dir ${databaseDir}.`);

  let cleanedUp = false;

  return {
    cleanup: async () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;

      await server.stop().catch(() => undefined);
      await db.close().catch(() => undefined);
    },
    databaseUrl: embeddedDatabaseUrl,
  };
}

function resolveEmbeddedDatabaseDir(backendRoot: string) {
  const configuredDir = process.env.DATABASE_DEV_FALLBACK_DIR?.trim();

  if (!configuredDir) {
    return join(backendRoot, DEFAULT_EMBEDDED_DATABASE_DIR);
  }

  return isAbsolute(configuredDir) ? configuredDir : join(backendRoot, configuredDir);
}

function buildEmbeddedDatabaseUrl(originalDatabaseUrl: string, host: string, port: string) {
  const originalUrl = new URL(originalDatabaseUrl);
  const schema = originalUrl.searchParams.get("schema") ?? "public";
  const embeddedDatabaseUrl = new URL(`postgresql://postgres:postgres@${host}:${port}/postgres`);

  embeddedDatabaseUrl.searchParams.set("schema", schema);
  embeddedDatabaseUrl.searchParams.set("sslmode", "disable");
  embeddedDatabaseUrl.searchParams.set("connection_limit", "1");

  return embeddedDatabaseUrl.toString();
}

async function prepareSchema(databaseUrl: string, logger: Logger) {
  const backendRoot = getBackendRoot();
  const schemaPath = join(backendRoot, "prisma", "schema.prisma");

  if (hasPrismaMigrations(backendRoot)) {
    logger.log("Applying Prisma migrations to embedded development PostgreSQL.");
    await runProcess(
      "prisma migrate deploy",
      [getPrismaCliEntry(backendRoot), "migrate", "deploy", "--schema", schemaPath],
      backendRoot,
      databaseUrl,
      logger
    );
    return;
  }

  logger.warn("No Prisma migration files were found. Falling back to prisma db push.");
  await runProcess(
    "prisma db push",
    [getPrismaCliEntry(backendRoot), "db", "push", "--skip-generate", "--schema", schemaPath],
    backendRoot,
    databaseUrl,
    logger
  );
}

function hasPrismaMigrations(backendRoot: string) {
  const migrationsDir = join(backendRoot, "prisma", "migrations");

  if (!existsSync(migrationsDir)) {
    return false;
  }

  return readdirSync(migrationsDir).some((entry) =>
    existsSync(join(migrationsDir, entry, "migration.sql"))
  );
}

async function seedDatabaseIfEmpty(databaseUrl: string, logger: Logger) {
  const seeded = await hasSeedData(databaseUrl);

  if (seeded) {
    logger.log("Embedded PostgreSQL already contains demo data. Skipping Prisma seed.");
    return;
  }

  const backendRoot = getBackendRoot();

  logger.log("Seeding embedded PostgreSQL with demo business data.");
  await runProcess(
    "prisma seed",
    [getTsxCliEntry(backendRoot), "prisma/seed.ts"],
    backendRoot,
    databaseUrl,
    logger
  );
}

async function hasSeedData(databaseUrl: string) {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();

    const tableResult = await client.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'User'
        ) AS "exists"
      `
    );

    if (!tableResult.rows[0]?.exists) {
      return false;
    }

    const countResult = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS "count" FROM "User"'
    );

    return (countResult.rows[0]?.count ?? 0) > 0;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function runProcess(
  label: string,
  args: string[],
  cwd: string,
  databaseUrl: string,
  logger: Logger
) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, args, {
      cwd,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      maxBuffer: PROCESS_OUTPUT_BUFFER_SIZE,
    });

    if (stdout.trim()) {
      logger.log(stdout.trim());
    }

    if (stderr.trim()) {
      logger.warn(stderr.trim());
    }
  } catch (error) {
    const childProcessError = error as ChildProcessError;

    logger.error(
      `Failed to run ${label}: ${
        childProcessError.stderr?.trim() || childProcessError.stdout?.trim() || childProcessError.message
      }`
    );

    throw error;
  }
}

function getPrismaCliEntry(backendRoot: string) {
  return require.resolve("prisma/build/index.js", {
    paths: [backendRoot, process.cwd()],
  });
}

function getTsxCliEntry(backendRoot: string) {
  return require.resolve("tsx/cli", {
    paths: [backendRoot, process.cwd()],
  });
}

function getBackendRoot() {
  const candidates = [
    resolve(process.cwd(), "apps", "backend"),
    process.cwd(),
    resolve(__dirname, "..", "..", ".."),
  ];

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "prisma", "schema.prisma"))) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve apps/backend workspace root.");
}

function getRepoRoot(backendRoot: string) {
  const repoRoot = resolve(backendRoot, "..", "..");

  if (existsSync(join(repoRoot, "package.json"))) {
    return repoRoot;
  }

  return process.cwd();
}

function sanitizeDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);

  if (url.password) {
    url.password = "***";
  }

  return url.toString();
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

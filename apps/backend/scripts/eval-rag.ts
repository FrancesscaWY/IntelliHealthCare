import { Logger } from "@nestjs/common";
import {
  Prisma,
  PrismaClient,
  RagDocumentStatus,
  RagEvalCaseStatus,
  RagEvalRunStatus,
  RagKnowledgeType,
  RagSourceType,
  RagVisibilityScope
} from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { bootstrapDatabase } from "../src/common/bootstrap/database-bootstrap";
import type { EnvironmentVariables } from "../src/common/config/env.schema";
import {
  normalizeRagQuery,
  scoreRagCandidate,
  tokenizeRagQuery
} from "../src/modules/agents/domain/rag-search.engine";
import {
  embedTextsWithRuntime,
  resolveEmbeddingRuntimeConfig
} from "../src/modules/agents/gateways/embedding.runtime";

type ScopeClause = {
  visibility: RagVisibilityScope;
  ownerUserId?: string;
  institutionId?: string;
};

type EvalDataset = {
  datasetName: string;
  datasetVersion?: string;
  cases: EvalCase[];
};

type EvalCase = {
  caseKey: string;
  query: string;
  limit?: number;
  knowledgeTypes?: RagKnowledgeType[];
  visibilityScopes?: RagVisibilityScope[];
  targetUserId?: string;
  institutionId?: string;
  expected: {
    knowledgeBaseCodes?: string[];
    sourceUris?: string[];
    titleIncludes?: string[];
    documentIds?: string[];
  };
};

type CandidateRow = {
  id: string;
  chunkIndex: number;
  title: string | null;
  content: string;
  headings: Prisma.JsonValue | null;
  keywords: Prisma.JsonValue | null;
  embedding: Prisma.JsonValue | null;
  visibility: RagVisibilityScope;
  ownerUserId: string | null;
  institutionId: string | null;
  document: {
    id: string;
    title: string;
    summary: string | null;
    sourceType: RagSourceType;
    sourceUri: string | null;
    publishedAt: Date | null;
    status: RagDocumentStatus;
  };
  knowledgeBase: {
    code: string;
    name: string;
    knowledgeType: RagKnowledgeType;
    visibility: RagVisibilityScope;
  };
};

async function main() {
  const logger = new Logger("RagEvaluationRunner");
  const options = parseOptions(process.argv.slice(2));
  const databaseBootstrap = await bootstrapDatabase(logger);
  const backendRoot = resolve(__dirname, "..");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseBootstrap.databaseUrl
      }
    }
  });

  try {
    const dataset = await loadDataset(options.datasetPath ?? defaultDatasetPath(backendRoot));
    const embeddingConfig = resolveEmbeddingRuntimeConfig({
      llmProvider: process.env.AGENT_LLM_PROVIDER as
        | EnvironmentVariables["AGENT_LLM_PROVIDER"]
        | undefined,
      llmBaseUrl: process.env.AGENT_LLM_BASE_URL,
      llmApiKey: process.env.AGENT_LLM_API_KEY,
      embeddingProvider: process.env.AGENT_EMBEDDING_PROVIDER as
        | EnvironmentVariables["AGENT_EMBEDDING_PROVIDER"]
        | undefined,
      embeddingBaseUrl: process.env.AGENT_EMBEDDING_BASE_URL,
      embeddingApiKey: process.env.AGENT_EMBEDDING_API_KEY,
      primaryModel: process.env.AGENT_EMBEDDING_MODEL ?? "qwen/qwen3-embedding-8b",
      fallbackModel: process.env.AGENT_EMBEDDING_FALLBACK_MODEL ?? "baai/bge-m3",
      timeoutMs: Number(process.env.AGENT_EMBEDDING_TIMEOUT_MS ?? 15_000),
      allowProviderFallbacks: parseBooleanEnv(
        process.env.AGENT_OPENROUTER_ALLOW_FALLBACKS,
        true
      ),
      zeroDataRetention: parseBooleanEnv(process.env.AGENT_OPENROUTER_ZDR, true)
    });

    const run = await prisma.ragEvalRun.create({
      data: {
        datasetName: dataset.datasetName,
        datasetVersion: dataset.datasetVersion,
        triggerSource: "script:eval-rag",
        status: RagEvalRunStatus.RUNNING,
        metadata: {
          datasetPath: options.datasetPath ?? defaultDatasetPath(backendRoot),
          failOnRegression: options.failOnRegression,
          minPassRate: options.minPassRate
        }
      }
    });

    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let reciprocalRankTotal = 0;
    let hitAt1 = 0;
    let hitAt3 = 0;
    let hitAt5 = 0;

    for (const testCase of dataset.cases) {
      const result = await evaluateCase(prisma, embeddingConfig, testCase);

      if (result.status === RagEvalCaseStatus.PASSED) {
        passedCount += 1;
        reciprocalRankTotal += result.metrics.reciprocalRank;
        if (result.metrics.hitAt1) {
          hitAt1 += 1;
        }
        if (result.metrics.hitAt3) {
          hitAt3 += 1;
        }
        if (result.metrics.hitAt5) {
          hitAt5 += 1;
        }
      } else if (result.status === RagEvalCaseStatus.SKIPPED) {
        skippedCount += 1;
      } else {
        failedCount += 1;
      }

      await prisma.ragEvalCaseResult.create({
        data: {
          evalRunId: run.id,
          caseKey: testCase.caseKey,
          status: result.status,
          query: testCase.query,
          limit: result.limit,
          targetUserId: testCase.targetUserId,
          institutionId: testCase.institutionId,
          knowledgeTypes: toJsonValue(testCase.knowledgeTypes),
          visibilityScopes: toJsonValue(testCase.visibilityScopes),
          expected: toJsonValue(testCase.expected),
          actual: toJsonValue(result.actual),
          metrics: toJsonValue(result.metrics)
        }
      });
    }

    const totalCases = dataset.cases.length;
    const executableCases = Math.max(totalCases - skippedCount, 1);
    const passRate = Number((passedCount / executableCases).toFixed(4));
    const mrr = Number((reciprocalRankTotal / executableCases).toFixed(4));
    const status =
      failedCount === 0 && skippedCount === 0
        ? RagEvalRunStatus.SUCCEEDED
        : RagEvalRunStatus.PARTIAL;
    const summary = {
      totalCases,
      passedCount,
      failedCount,
      skippedCount,
      passRate,
      hitAt1: Number((hitAt1 / executableCases).toFixed(4)),
      hitAt3: Number((hitAt3 / executableCases).toFixed(4)),
      hitAt5: Number((hitAt5 / executableCases).toFixed(4)),
      mrr
    };

    await prisma.ragEvalRun.update({
      where: { id: run.id },
      data: {
        status,
        summary: toJsonValue(summary),
        completedAt: new Date()
      }
    });

    logger.log(`RAG eval completed: ${JSON.stringify({ runId: run.id, ...summary })}`);

    if (options.failOnRegression && passRate < options.minPassRate) {
      throw new Error(
        `RAG eval pass rate ${passRate} is below required threshold ${options.minPassRate}`
      );
    }
  } catch (error) {
    logger.error(getErrorMessage(error));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await databaseBootstrap.cleanup().catch(() => undefined);
  }
}

async function evaluateCase(
  prisma: PrismaClient,
  embeddingConfig: ReturnType<typeof resolveEmbeddingRuntimeConfig>,
  testCase: EvalCase
) {
  const limit = Math.min(Math.max(testCase.limit ?? 5, 1), 10);
  const normalizedQuery = normalizeRagQuery(testCase.query);
  const tokens = tokenizeRagQuery(normalizedQuery);
  const scopeClauses = buildScopeClauses(testCase);

  if (scopeClauses.length === 0) {
    return {
      status: RagEvalCaseStatus.SKIPPED,
      limit,
      actual: {
        reason: "No valid scope clauses were produced"
      },
      metrics: {
        matchedRank: null,
        reciprocalRank: 0,
        hitAt1: false,
        hitAt3: false,
        hitAt5: false
      }
    };
  }

  const lexicalCandidates = await fetchCandidates(prisma, {
    scopeClauses,
    tokens,
    limit: getCandidateLimit(limit)
  });
  const candidates =
    lexicalCandidates.length > 0
      ? lexicalCandidates
      : await fetchCandidates(prisma, {
          scopeClauses,
          limit: getCandidateLimit(limit)
        });

  const filteredCandidates = candidates.filter((candidate) => {
    if (candidate.document.status !== RagDocumentStatus.ACTIVE) {
      return false;
    }

    if (
      testCase.knowledgeTypes?.length &&
      !testCase.knowledgeTypes.includes(candidate.knowledgeBase.knowledgeType)
    ) {
      return false;
    }

    return true;
  });

  const queryEmbedding = await embedTextsWithRuntime({
    agentName: "RagEvaluationRunner",
    texts: [normalizedQuery],
    config: embeddingConfig
  }).catch(() => null);
  const queryVector = queryEmbedding?.vectors[0] ?? null;
  const ranked = filteredCandidates
    .map((candidate) => ({
      candidate,
      ...scoreRagCandidate(candidate, normalizedQuery, tokens, queryVector)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  const results = ranked.slice(0, limit);
  const matchedIndex = results.findIndex((item) => matchesExpectation(item.candidate, testCase));
  const matchedRank = matchedIndex >= 0 ? matchedIndex + 1 : null;
  const status = matchedRank ? RagEvalCaseStatus.PASSED : RagEvalCaseStatus.FAILED;

  return {
    status,
    limit,
    actual: {
      candidateCount: filteredCandidates.length,
      embedding: queryEmbedding?.trace ?? null,
      topResults: results.map((item) => ({
        rank: results.indexOf(item) + 1,
        score: item.score,
        matchedTerms: item.matchedTerms,
        knowledgeBaseCode: item.candidate.knowledgeBase.code,
        documentId: item.candidate.document.id,
        title: item.candidate.document.title,
        sourceUri: item.candidate.document.sourceUri,
        excerpt: item.excerpt
      }))
    },
    metrics: {
      matchedRank,
      reciprocalRank: matchedRank ? Number((1 / matchedRank).toFixed(4)) : 0,
      hitAt1: matchedRank === 1,
      hitAt3: matchedRank !== null && matchedRank <= 3,
      hitAt5: matchedRank !== null && matchedRank <= 5
    }
  };
}

function matchesExpectation(
  candidate: CandidateRow,
  testCase: EvalCase
) {
  const checks = [
    !testCase.expected.knowledgeBaseCodes?.length ||
      testCase.expected.knowledgeBaseCodes.includes(candidate.knowledgeBase.code),
    !testCase.expected.sourceUris?.length ||
      testCase.expected.sourceUris.includes(candidate.document.sourceUri ?? ""),
    !testCase.expected.documentIds?.length ||
      testCase.expected.documentIds.includes(candidate.document.id),
    !testCase.expected.titleIncludes?.length ||
      testCase.expected.titleIncludes.some((item) =>
        candidate.document.title.toLowerCase().includes(item.toLowerCase())
      )
  ];

  return checks.every(Boolean);
}

async function fetchCandidates(
  prisma: PrismaClient,
  input: {
    scopeClauses: ScopeClause[];
    tokens?: string[];
    limit: number;
  }
) {
  const where: Prisma.RagChunkWhereInput = input.tokens?.length
    ? {
        AND: [
          {
            OR: buildScopeWhere(input.scopeClauses)
          },
          {
            OR: input.tokens.flatMap((token) => [
              {
                title: {
                  contains: token,
                  mode: "insensitive"
                }
              },
              {
                content: {
                  contains: token,
                  mode: "insensitive"
                }
              }
            ])
          }
        ]
      }
    : {
        OR: buildScopeWhere(input.scopeClauses)
      };

  return prisma.ragChunk.findMany({
    where,
    take: input.limit,
    orderBy: { createdAt: "desc" },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          summary: true,
          sourceType: true,
          sourceUri: true,
          publishedAt: true,
          status: true
        }
      },
      knowledgeBase: {
        select: {
          code: true,
          name: true,
          knowledgeType: true,
          visibility: true
        }
      }
    }
  });
}

function buildScopeWhere(scopeClauses: ScopeClause[]) {
  return scopeClauses.map((scope) => ({
    visibility: scope.visibility,
    ...(scope.ownerUserId ? { ownerUserId: scope.ownerUserId } : {}),
    ...(scope.institutionId ? { institutionId: scope.institutionId } : {})
  }));
}

function buildScopeClauses(testCase: EvalCase) {
  const visibilityScopes =
    testCase.visibilityScopes?.length
      ? Array.from(new Set(testCase.visibilityScopes))
      : [RagVisibilityScope.PUBLIC];

  return visibilityScopes.flatMap<ScopeClause>((visibility) => {
    if (visibility === RagVisibilityScope.PUBLIC) {
      return [{ visibility }];
    }

    if (visibility === RagVisibilityScope.USER_PRIVATE) {
      return testCase.targetUserId
        ? [{ visibility, ownerUserId: testCase.targetUserId }]
        : [];
    }

    return testCase.institutionId
      ? [{ visibility, institutionId: testCase.institutionId }]
      : [];
  });
}

function getCandidateLimit(limit: number) {
  return Math.min(Math.max(limit * 12, 40), 120);
}

async function loadDataset(path: string) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as EvalDataset;
}

function defaultDatasetPath(backendRoot: string) {
  return join(backendRoot, "scripts", "evals", "rag-regression.dataset.json");
}

function parseOptions(args: string[]) {
  let datasetPath: string | undefined;
  let failOnRegression = false;
  let minPassRate = 0.8;

  for (const arg of args) {
    if (arg === "--fail-on-regression") {
      failOnRegression = true;
      continue;
    }

    if (arg.startsWith("--dataset=")) {
      datasetPath = resolve(arg.slice("--dataset=".length));
      continue;
    }

    if (arg.startsWith("--min-pass-rate=")) {
      const value = Number(arg.slice("--min-pass-rate=".length));
      if (Number.isFinite(value) && value > 0 && value <= 1) {
        minPassRate = value;
      }
    }
  }

  return {
    datasetPath,
    failOnRegression,
    minPassRate
  };
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === undefined || value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

void main();

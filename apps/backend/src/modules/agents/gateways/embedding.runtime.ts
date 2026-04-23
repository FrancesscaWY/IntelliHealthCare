import type { EnvironmentVariables } from "../../../common/config/env.schema";
import type { EmbeddingResponse, LlmTrace } from "../domain/agent-types";

type LoggerLike = {
  warn(message: string): void;
};

type EmbeddingProvider = "mock" | "openrouter" | "openai-compatible";

export interface EmbeddingRuntimeConfig {
  provider: EmbeddingProvider;
  baseUrl: string | null;
  apiKey: string | null;
  primaryModel: string;
  fallbackModel: string;
  timeoutMs: number;
  allowProviderFallbacks: boolean;
  zeroDataRetention: boolean;
}

export interface EmbedTextsRuntimeInput {
  agentName: string;
  texts: string[];
  config: EmbeddingRuntimeConfig;
  fallbackFactory?: () => Promise<number[][]> | number[][];
  logger?: LoggerLike;
}

interface EmbeddingsResponsePayload {
  data?: Array<{
    embedding?: number[];
  }>;
}

export function resolveEmbeddingRuntimeConfig(input: {
  llmProvider?: EnvironmentVariables["AGENT_LLM_PROVIDER"];
  llmBaseUrl?: string;
  llmApiKey?: string;
  embeddingProvider?: EnvironmentVariables["AGENT_EMBEDDING_PROVIDER"];
  embeddingBaseUrl?: string;
  embeddingApiKey?: string;
  primaryModel: string;
  fallbackModel: string;
  timeoutMs: number;
  allowProviderFallbacks: boolean;
  zeroDataRetention: boolean;
}): EmbeddingRuntimeConfig {
  const provider = inferEmbeddingProvider(input.embeddingProvider, input.llmProvider);

  return {
    provider,
    baseUrl: normalizeOptionalString(input.embeddingBaseUrl) ?? normalizeOptionalString(input.llmBaseUrl),
    apiKey: normalizeOptionalString(input.embeddingApiKey) ?? normalizeOptionalString(input.llmApiKey),
    primaryModel: input.primaryModel,
    fallbackModel: input.fallbackModel,
    timeoutMs: input.timeoutMs,
    allowProviderFallbacks: input.allowProviderFallbacks,
    zeroDataRetention: input.zeroDataRetention
  };
}

export async function embedTextsWithRuntime(
  input: EmbedTextsRuntimeInput
): Promise<EmbeddingResponse> {
  const attemptedModels = Array.from(
    new Set([input.config.primaryModel, input.config.fallbackModel].filter(Boolean))
  );

  if (
    input.config.provider === "mock" ||
    !input.config.baseUrl ||
    !input.config.apiKey
  ) {
    return {
      vectors: await buildFallbackVectors(input.texts, input.fallbackFactory),
      trace: buildTrace({
        provider: input.config.provider,
        model: input.config.fallbackModel,
        fallbackMode: true,
        modelTier: "fallback",
        attemptedModels,
        strictJson: false,
        toolCalling: false,
        ...(input.config.provider !== "mock" && !input.config.apiKey
          ? { error: "Embedding API key is not configured" }
          : !input.config.baseUrl
            ? { error: "Embedding base URL is not configured" }
            : {})
      })
    };
  }

  try {
    for (const [index, model] of attemptedModels.entries()) {
      try {
        const vectors = await requestEmbeddings({
          baseUrl: input.config.baseUrl,
          apiKey: input.config.apiKey,
          provider: input.config.provider,
          model,
          texts: input.texts,
          timeoutMs: input.config.timeoutMs,
          allowProviderFallbacks: input.config.allowProviderFallbacks,
          zeroDataRetention: input.config.zeroDataRetention
        });

        return {
          vectors,
          trace: buildTrace({
            provider: input.config.provider,
            model,
            fallbackMode: index > 0,
            modelTier: index > 0 ? "fallback" : "primary",
            attemptedModels,
            strictJson: false,
            toolCalling: false
          })
        };
      } catch (error) {
        if (index < attemptedModels.length - 1) {
          input.logger?.warn(
            `Embedding request failed for ${input.agentName} on model ${model}, trying fallback model: ${getErrorMessage(error)}`
          );
          continue;
        }

        throw error;
      }
    }

    throw new Error("Embedding request did not return a result");
  } catch (error) {
    const message = getErrorMessage(error);
    input.logger?.warn(
      `Embedding request failed for ${input.agentName}, falling back to deterministic vectors: ${message}`
    );

    return {
      vectors: await buildFallbackVectors(input.texts, input.fallbackFactory),
      trace: buildTrace({
        provider: `${input.config.provider}-fallback`,
        model: input.config.fallbackModel,
        fallbackMode: true,
        modelTier: "fallback",
        attemptedModels,
        strictJson: false,
        toolCalling: false,
        error: message
      })
    };
  }
}

export async function requestEmbeddings(input: {
  baseUrl: string;
  apiKey: string;
  provider: EmbeddingProvider;
  model: string;
  texts: string[];
  timeoutMs: number;
  allowProviderFallbacks: boolean;
  zeroDataRetention: boolean;
}) {
  const endpoint = `${input.baseUrl.replace(/\/$/, "")}/embeddings`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`
      },
      body: JSON.stringify({
        model: input.model,
        input: input.texts,
        encoding_format: "float",
        ...(input.provider === "openrouter"
          ? {
              provider: {
                allow_fallbacks: input.allowProviderFallbacks,
                data_collection: input.zeroDataRetention ? "deny" : "allow",
                sort: "throughput"
              }
            }
          : {})
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Embedding gateway responded with ${response.status}`);
    }

    const payload = (await response.json()) as EmbeddingsResponsePayload;
    const vectors = payload.data?.map((item) => item.embedding ?? []) ?? [];

    if (vectors.length !== input.texts.length) {
      throw new Error("Embedding gateway returned an unexpected vector count");
    }

    return vectors;
  } finally {
    clearTimeout(timeout);
  }
}

export async function embedTextBatches(input: {
  agentName: string;
  texts: string[];
  config: EmbeddingRuntimeConfig;
  batchSize?: number;
  logger?: LoggerLike;
}) {
  if (input.texts.length === 0) {
    return {
      vectors: [] as number[][],
      trace: buildTrace({
        provider: input.config.provider,
        model: input.config.primaryModel,
        fallbackMode: false,
        modelTier: "primary",
        attemptedModels: [input.config.primaryModel],
        strictJson: false,
        toolCalling: false
      })
    };
  }

  const batchSize = Math.max(1, Math.min(input.batchSize ?? 24, 96));
  const vectors: number[][] = [];
  let trace: LlmTrace | null = null;

  for (let index = 0; index < input.texts.length; index += batchSize) {
    const chunk = input.texts.slice(index, index + batchSize);
    const response = await embedTextsWithRuntime({
      agentName: input.agentName,
      texts: chunk,
      config: input.config,
      logger: input.logger
    });

    vectors.push(...response.vectors);
    trace = response.trace;
  }

  return {
    vectors,
    trace:
      trace ??
      buildTrace({
        provider: input.config.provider,
        model: input.config.primaryModel,
        fallbackMode: false,
        modelTier: "primary",
        attemptedModels: [input.config.primaryModel],
        strictJson: false,
        toolCalling: false
      })
  };
}

export async function buildFallbackVectors(
  texts: string[],
  fallbackFactory?: () => Promise<number[][]> | number[][]
) {
  if (fallbackFactory) {
    return fallbackFactory();
  }

  return texts.map((text) => buildDeterministicVector(text));
}

export function buildDeterministicVector(text: string, dimensions = 64) {
  const vector = Array.from({ length: dimensions }, () => 0);

  for (let index = 0; index < text.length; index += 1) {
    const slot = index % dimensions;
    vector[slot] += text.charCodeAt(index);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => Number((value / magnitude).toFixed(8)));
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown embedding error";
}

function buildTrace(trace: LlmTrace): LlmTrace {
  return trace;
}

function inferEmbeddingProvider(
  embeddingProvider: EnvironmentVariables["AGENT_EMBEDDING_PROVIDER"] | undefined,
  llmProvider: EnvironmentVariables["AGENT_LLM_PROVIDER"] | undefined
): EmbeddingProvider {
  if (embeddingProvider === "openrouter" || embeddingProvider === "openai-compatible") {
    return embeddingProvider;
  }

  if (llmProvider === "openrouter" || llmProvider === "openai-compatible") {
    return llmProvider;
  }

  return "mock";
}

function normalizeOptionalString(value: string | undefined | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

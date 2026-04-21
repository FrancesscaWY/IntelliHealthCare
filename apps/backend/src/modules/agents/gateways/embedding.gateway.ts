import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import type { EmbeddingResponse, LlmTrace } from "../domain/agent-types";

interface EmbedTextsInput {
  agentName: string;
  texts: string[];
  fallbackFactory?: () => Promise<number[][]> | number[][];
}

interface EmbeddingsResponse {
  data?: Array<{
    embedding?: number[];
  }>;
}

@Injectable()
export class EmbeddingGateway {
  private readonly logger = new Logger(EmbeddingGateway.name);

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  async embedTexts(input: EmbedTextsInput): Promise<EmbeddingResponse> {
    const provider = this.configService.get("AGENT_LLM_PROVIDER", { infer: true });
    const baseUrl = this.configService.get("AGENT_LLM_BASE_URL", { infer: true });
    const apiKey = this.configService.get("AGENT_LLM_API_KEY", { infer: true });
    const primaryModel = this.configService.get("AGENT_EMBEDDING_MODEL", {
      infer: true
    });
    const fallbackModel = this.configService.get("AGENT_EMBEDDING_FALLBACK_MODEL", {
      infer: true
    });
    const attemptedModels = Array.from(new Set([primaryModel, fallbackModel]));

    if (provider === "mock" || !baseUrl || !apiKey) {
      return {
        vectors: await this.buildFallbackVectors(input),
        trace: this.buildTrace({
          provider: "mock",
          model: fallbackModel,
          fallbackMode: true,
          modelTier: "fallback",
          attemptedModels,
          strictJson: false,
          toolCalling: false
        })
      };
    }

    try {
      for (const [index, model] of attemptedModels.entries()) {
        try {
          const vectors = await this.requestEmbeddings({
            baseUrl,
            apiKey,
            provider,
            model,
            texts: input.texts
          });

          return {
            vectors,
            trace: this.buildTrace({
              provider,
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
            this.logger.warn(
              `Embedding request failed for ${input.agentName} on model ${model}, trying fallback model: ${this.getErrorMessage(error)}`
            );
            continue;
          }

          throw error;
        }
      }

      throw new Error("Embedding request did not return a result");
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.warn(
        `Embedding request failed for ${input.agentName}, falling back to deterministic vectors: ${message}`
      );

      return {
        vectors: await this.buildFallbackVectors(input),
        trace: this.buildTrace({
          provider: "mock-fallback",
          model: fallbackModel,
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

  private async requestEmbeddings(input: {
    baseUrl: string;
    apiKey: string;
    provider: EnvironmentVariables["AGENT_LLM_PROVIDER"];
    model: string;
    texts: string[];
  }) {
    const timeoutMs = this.configService.get("AGENT_EMBEDDING_TIMEOUT_MS", {
      infer: true
    });
    const allowProviderFallbacks = this.configService.get(
      "AGENT_OPENROUTER_ALLOW_FALLBACKS",
      {
        infer: true
      }
    );
    const zeroDataRetention = this.configService.get("AGENT_OPENROUTER_ZDR", {
      infer: true
    });
    const endpoint = `${input.baseUrl.replace(/\/$/, "")}/embeddings`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
                  allow_fallbacks: allowProviderFallbacks,
                  data_collection: zeroDataRetention ? "deny" : "allow",
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

      const payload = (await response.json()) as EmbeddingsResponse;
      const vectors = payload.data?.map((item) => item.embedding ?? []) ?? [];

      if (vectors.length !== input.texts.length) {
        throw new Error("Embedding gateway returned an unexpected vector count");
      }

      return vectors;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async buildFallbackVectors(input: EmbedTextsInput) {
    if (input.fallbackFactory) {
      return input.fallbackFactory();
    }

    return input.texts.map((text) => this.buildDeterministicVector(text));
  }

  private buildDeterministicVector(text: string, dimensions = 64) {
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

  private buildTrace(trace: LlmTrace): LlmTrace {
    return trace;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown embedding error";
  }
}

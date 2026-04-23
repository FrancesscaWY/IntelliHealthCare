import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import type { EmbeddingResponse } from "../domain/agent-types";
import {
  buildDeterministicVector,
  embedTextsWithRuntime,
  resolveEmbeddingRuntimeConfig
} from "./embedding.runtime";

interface EmbedTextsInput {
  agentName: string;
  texts: string[];
  fallbackFactory?: () => Promise<number[][]> | number[][];
}

@Injectable()
export class EmbeddingGateway {
  private readonly logger = new Logger(EmbeddingGateway.name);

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  async embedTexts(input: EmbedTextsInput): Promise<EmbeddingResponse> {
    return embedTextsWithRuntime({
      agentName: input.agentName,
      texts: input.texts,
      config: resolveEmbeddingRuntimeConfig({
        llmProvider: this.configService.get("AGENT_LLM_PROVIDER", { infer: true }),
        llmBaseUrl: this.configService.get("AGENT_LLM_BASE_URL", { infer: true }),
        llmApiKey: this.configService.get("AGENT_LLM_API_KEY", { infer: true }),
        embeddingProvider: this.configService.get("AGENT_EMBEDDING_PROVIDER", {
          infer: true
        }),
        embeddingBaseUrl: this.configService.get("AGENT_EMBEDDING_BASE_URL", {
          infer: true
        }),
        embeddingApiKey: this.configService.get("AGENT_EMBEDDING_API_KEY", {
          infer: true
        }),
        primaryModel: this.configService.get("AGENT_EMBEDDING_MODEL", {
          infer: true
        }),
        fallbackModel: this.configService.get("AGENT_EMBEDDING_FALLBACK_MODEL", {
          infer: true
        }),
        timeoutMs: this.configService.get("AGENT_EMBEDDING_TIMEOUT_MS", {
          infer: true
        }),
        allowProviderFallbacks: this.configService.get(
          "AGENT_OPENROUTER_ALLOW_FALLBACKS",
          {
            infer: true
          }
        ),
        zeroDataRetention: this.configService.get("AGENT_OPENROUTER_ZDR", {
          infer: true
        })
      }),
      fallbackFactory: () => this.buildFallbackVectors(input),
      logger: this.logger
    });
  }

  private async buildFallbackVectors(input: EmbedTextsInput) {
    if (input.fallbackFactory) {
      return input.fallbackFactory();
    }

    return input.texts.map((text) => this.buildDeterministicVector(text));
  }

  private buildDeterministicVector(text: string, dimensions = 64) {
    return buildDeterministicVector(text, dimensions);
  }
}

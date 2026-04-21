import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import type { LlmStructuredResponse } from "../domain/agent-types";

interface GenerateStructuredObjectInput<TOutput> {
  agentName: string;
  systemPrompt: string;
  userPrompt: string;
  outputSchema: z.ZodType<TOutput>;
  fallbackFactory: () => Promise<TOutput> | TOutput;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

@Injectable()
export class LlmGateway {
  private readonly logger = new Logger(LlmGateway.name);

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) {}

  async generateStructuredObject<TOutput>(
    input: GenerateStructuredObjectInput<TOutput>
  ): Promise<LlmStructuredResponse<TOutput>> {
    const provider = this.configService.get("AGENT_LLM_PROVIDER", { infer: true });
    const baseUrl = this.configService.get("AGENT_LLM_BASE_URL", { infer: true });
    const apiKey = this.configService.get("AGENT_LLM_API_KEY", { infer: true });
    const model = this.configService.get("AGENT_LLM_MODEL", { infer: true });
    const fallbackModel = this.configService.get("AGENT_LLM_FALLBACK_MODEL", {
      infer: true
    });

    if (provider === "mock" || !baseUrl || !apiKey) {
      const output = input.outputSchema.parse(await input.fallbackFactory());

      return {
        output,
        trace: {
          provider: "mock",
          model: fallbackModel,
          fallbackMode: true
        }
      };
    }

    try {
      const output = await this.requestOpenAiCompatible({
        baseUrl,
        apiKey,
        model,
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
        outputSchema: input.outputSchema
      });

      return {
        output,
        trace: {
          provider,
          model,
          fallbackMode: false
        }
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.warn(
        `LLM request failed for ${input.agentName}, falling back to deterministic output: ${message}`
      );

      const output = input.outputSchema.parse(await input.fallbackFactory());

      return {
        output,
        trace: {
          provider: "mock-fallback",
          model: fallbackModel,
          fallbackMode: true,
          error: message
        }
      };
    }
  }

  private async requestOpenAiCompatible<TOutput>(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    outputSchema: z.ZodType<TOutput>;
  }) {
    const timeoutMs = this.configService.get("AGENT_LLM_TIMEOUT_MS", {
      infer: true
    });
    const endpoint = `${input.baseUrl.replace(/\/$/, "")}/chat/completions`;
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
          temperature: 0.2,
          response_format: {
            type: "json_object"
          },
          messages: [
            {
              role: "system",
              content: input.systemPrompt
            },
            {
              role: "user",
              content: input.userPrompt
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`LLM gateway responded with ${response.status}`);
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const content = this.extractContent(payload);

      if (!content) {
        throw new Error("LLM gateway returned empty content");
      }

      const parsedJson = JSON.parse(this.normalizeJsonText(content)) as unknown;
      return input.outputSchema.parse(parsedJson);
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractContent(payload: ChatCompletionResponse) {
    const content = payload.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => item.text ?? "")
        .join("")
        .trim();
    }

    return "";
  }

  private normalizeJsonText(value: string) {
    return value
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown LLM error";
  }
}

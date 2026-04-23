import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import type { EnvironmentVariables } from "../../../common/config/env.schema";
import type {
  LlmModelTier,
  LlmStructuredResponse,
  LlmToolCall,
  LlmToolCallResponse,
  LlmToolChoice,
  LlmToolDefinition,
  LlmTrace
} from "../domain/agent-types";

interface GenerateStructuredObjectInput<TOutput> {
  agentName: string;
  systemPrompt: string;
  userPrompt: string;
  outputSchema: z.ZodType<TOutput>;
  modelTier?: LlmModelTier;
  fallbackFactory: () => Promise<TOutput> | TOutput;
}

interface GenerateToolCallsInput {
  agentName: string;
  systemPrompt: string;
  userPrompt: string;
  tools: LlmToolDefinition[];
  modelTier?: LlmModelTier;
  toolChoice?: LlmToolChoice;
  fallbackFactory?: () => Promise<LlmToolCall[]> | LlmToolCall[];
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
      tool_calls?: Array<{
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
}

interface ClientConfig {
  provider: EnvironmentVariables["AGENT_LLM_PROVIDER"];
  baseUrl: string;
  apiKey: string;
  strictJson: boolean;
  requireToolCalling: boolean;
  allowProviderFallbacks: boolean;
  zeroDataRetention: boolean;
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
    const clientConfig = this.getClientConfig();
    const effectiveStrictJson = this.usesJsonSchemaResponseFormat(clientConfig);

    if (this.shouldUseDeterministicFallback(clientConfig)) {
      const output = input.outputSchema.parse(await input.fallbackFactory());

      return {
        output,
        trace: this.buildTrace({
          provider: "mock",
          model: this.resolveChatModel("fallback"),
          fallbackMode: true,
          modelTier: input.modelTier ?? "primary",
          attemptedModels: [this.resolveChatModel(input.modelTier ?? "primary")],
          strictJson: effectiveStrictJson,
          toolCalling: false
        })
      };
    }

    const modelTier = input.modelTier ?? "primary";
    const attemptedModels = this.resolveCandidateModels(modelTier);

    try {
      for (const [index, model] of attemptedModels.entries()) {
        try {
          const output = await this.requestStructuredObject({
            clientConfig,
            model,
            agentName: input.agentName,
            systemPrompt: input.systemPrompt,
            userPrompt: input.userPrompt,
            outputSchema: input.outputSchema
          });

          return {
            output,
            trace: this.buildTrace({
              provider: clientConfig.provider,
              model,
              fallbackMode: index > 0,
              modelTier,
              attemptedModels,
              strictJson: effectiveStrictJson,
              toolCalling: false
            })
          };
        } catch (error) {
          if (index < attemptedModels.length - 1) {
            this.logger.warn(
              `LLM request failed for ${input.agentName} on model ${model}, trying fallback model: ${this.getErrorMessage(error)}`
            );
            continue;
          }

          throw error;
        }
      }

      throw new Error("LLM request did not return a result");
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.warn(
        `LLM request failed for ${input.agentName}, falling back to deterministic output: ${message}`
      );

      const output = input.outputSchema.parse(await input.fallbackFactory());

      return {
        output,
        trace: this.buildTrace({
          provider: "mock-fallback",
          model: this.resolveChatModel("fallback"),
          fallbackMode: true,
          modelTier,
          attemptedModels,
          strictJson: effectiveStrictJson,
          toolCalling: false,
          error: message
        })
      };
    }
  }

  async generateToolCalls(
    input: GenerateToolCallsInput
  ): Promise<LlmToolCallResponse> {
    const clientConfig = this.getClientConfig();
    const modelTier = input.modelTier ?? "light";
    const attemptedModels = this.resolveCandidateModels(modelTier);

    if (this.shouldUseDeterministicFallback(clientConfig)) {
      return {
        toolCalls: await this.buildToolCallFallback(input),
        text: "",
        trace: this.buildTrace({
          provider: "mock",
          model: this.resolveChatModel("fallback"),
          fallbackMode: true,
          modelTier,
          attemptedModels,
          strictJson: false,
          toolCalling: true
        })
      };
    }

    try {
      for (const [index, model] of attemptedModels.entries()) {
        try {
          const payload = await this.requestToolCalls({
            clientConfig,
            model,
            agentName: input.agentName,
            systemPrompt: input.systemPrompt,
            userPrompt: input.userPrompt,
            tools: input.tools,
            toolChoice: input.toolChoice
          });

          return {
            toolCalls: this.extractToolCalls(payload),
            text: this.extractContent(payload),
            trace: this.buildTrace({
              provider: clientConfig.provider,
              model,
              fallbackMode: index > 0,
              modelTier,
              attemptedModels,
              strictJson: false,
              toolCalling: true
            })
          };
        } catch (error) {
          if (index < attemptedModels.length - 1) {
            this.logger.warn(
              `Tool-calling request failed for ${input.agentName} on model ${model}, trying fallback model: ${this.getErrorMessage(error)}`
            );
            continue;
          }

          throw error;
        }
      }

      throw new Error("Tool-calling request did not return a result");
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.warn(
        `Tool-calling request failed for ${input.agentName}, falling back to deterministic tool plan: ${message}`
      );

      return {
        toolCalls: await this.buildToolCallFallback(input),
        text: "",
        trace: this.buildTrace({
          provider: "mock-fallback",
          model: this.resolveChatModel("fallback"),
          fallbackMode: true,
          modelTier,
          attemptedModels,
          strictJson: false,
          toolCalling: true,
          error: message
        })
      };
    }
  }

  private async requestStructuredObject<TOutput>(input: {
    clientConfig: ClientConfig;
    model: string;
    agentName: string;
    systemPrompt: string;
    userPrompt: string;
    outputSchema: z.ZodType<TOutput>;
  }) {
    const useJsonSchema = this.usesJsonSchemaResponseFormat(input.clientConfig);

    const payload = await this.requestChatCompletion({
      clientConfig: input.clientConfig,
      model: this.resolveProviderModel(input.clientConfig.provider, input.model),
      body: {
        temperature: 0.2,
        response_format: useJsonSchema
          ? {
              type: "json_schema",
              json_schema: {
                name: this.normalizeSchemaName(input.agentName),
                strict: true,
                schema: z.toJSONSchema(input.outputSchema)
              }
            }
          : {
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
      }
    });

    const content = this.extractContent(payload);

    if (!content) {
      throw new Error("LLM gateway returned empty content");
    }

    const parsedJson = JSON.parse(this.normalizeJsonText(content)) as unknown;
    return input.outputSchema.parse(parsedJson);
  }

  private async requestToolCalls(input: {
    clientConfig: ClientConfig;
    model: string;
    agentName: string;
    systemPrompt: string;
    userPrompt: string;
    tools: LlmToolDefinition[];
    toolChoice?: LlmToolChoice;
  }) {
    const payload = await this.requestChatCompletion({
      clientConfig: input.clientConfig,
      model: this.resolveProviderModel(input.clientConfig.provider, input.model),
      body: {
        temperature: 0,
        messages: [
          {
            role: "system",
            content: input.systemPrompt
          },
          {
            role: "user",
            content: input.userPrompt
          }
        ],
        tools: input.tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: z.toJSONSchema(tool.inputSchema)
          }
        })),
        tool_choice: this.resolveToolChoice(input.toolChoice, input.clientConfig)
      }
    });

    const toolCalls = this.extractToolCalls(payload);

    if (
      input.clientConfig.requireToolCalling &&
      toolCalls.length === 0 &&
      input.tools.length > 0
    ) {
      throw new Error("LLM gateway returned no tool calls");
    }

    return payload;
  }

  private async requestChatCompletion(input: {
    clientConfig: ClientConfig;
    model: string;
    body: Record<string, unknown>;
  }) {
    const timeoutMs = this.configService.get("AGENT_LLM_TIMEOUT_MS", { infer: true });
    const endpoint = `${input.clientConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.clientConfig.apiKey}`
        },
        body: JSON.stringify({
          model: input.model,
          ...input.body,
          ...(input.clientConfig.provider === "openrouter"
            ? {
                provider: {
                  allow_fallbacks: input.clientConfig.allowProviderFallbacks,
                  data_collection: input.clientConfig.zeroDataRetention
                    ? "deny"
                    : "allow",
                  sort: "throughput"
                }
              }
            : {})
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`LLM gateway responded with ${response.status}`);
      }

      return (await response.json()) as ChatCompletionResponse;
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

  private extractToolCalls(payload: ChatCompletionResponse): LlmToolCall[] {
    const toolCalls = payload.choices?.[0]?.message?.tool_calls ?? [];

    return toolCalls.flatMap((toolCall) => {
      const name = toolCall.function?.name?.trim();

      if (!name) {
        return [];
      }

      return [
        {
          callId: toolCall.id,
          name,
          arguments: this.parseToolArguments(toolCall.function?.arguments)
        }
      ];
    });
  }

  private parseToolArguments(argumentsText: string | undefined) {
    if (!argumentsText?.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(argumentsText) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private normalizeJsonText(value: string) {
    return value
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }

  private normalizeSchemaName(value: string) {
    const normalized = value.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    return normalized || "structured_output";
  }

  private resolveCandidateModels(modelTier: LlmModelTier) {
    return Array.from(
      new Set(
        [this.resolveChatModel(modelTier), this.resolveChatModel("fallback")].filter(Boolean)
      )
    );
  }

  private resolveChatModel(modelTier: LlmModelTier) {
    switch (modelTier) {
      case "light":
        return this.configService.get("AGENT_LLM_LIGHT_MODEL", { infer: true });
      case "fallback":
        return this.configService.get("AGENT_LLM_FALLBACK_MODEL", { infer: true });
      default:
        return this.configService.get("AGENT_LLM_MODEL", { infer: true });
    }
  }

  private usesJsonSchemaResponseFormat(clientConfig: ClientConfig) {
    // DeepSeek official API currently documents `json_object`, not `json_schema`.
    return clientConfig.strictJson && clientConfig.provider !== "deepseek";
  }

  private resolveProviderModel(provider: ClientConfig["provider"], model: string) {
    if (provider !== "deepseek") {
      return model;
    }

    return model.replace(/^deepseek\//i, "").trim() || "deepseek-chat";
  }

  private resolveToolChoice(
    toolChoice: LlmToolChoice | undefined,
    clientConfig: ClientConfig
  ) {
    if (!toolChoice) {
      return clientConfig.requireToolCalling ? "required" : "auto";
    }

    if (toolChoice === "auto" || toolChoice === "required") {
      return toolChoice;
    }

    return {
      type: "function",
      function: {
        name: toolChoice.name
      }
    };
  }

  private async buildToolCallFallback(input: GenerateToolCallsInput) {
    if (input.fallbackFactory) {
      return input.fallbackFactory();
    }

    return [];
  }

  private shouldUseDeterministicFallback(input: ClientConfig) {
    return input.provider === "mock" || !input.baseUrl || !input.apiKey;
  }

  private getClientConfig(): ClientConfig {
    return {
      provider: this.configService.get("AGENT_LLM_PROVIDER", { infer: true }),
      baseUrl: this.configService.get("AGENT_LLM_BASE_URL", { infer: true }),
      apiKey: this.configService.get("AGENT_LLM_API_KEY", { infer: true }),
      strictJson: this.configService.get("AGENT_STRICT_JSON_OUTPUT", {
        infer: true
      }),
      requireToolCalling: this.configService.get("AGENT_REQUIRE_TOOL_CALLING", {
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
    };
  }

  private buildTrace(trace: LlmTrace): LlmTrace {
    return trace;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown LLM error";
  }
}

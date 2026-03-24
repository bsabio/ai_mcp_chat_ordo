import Anthropic from "@anthropic-ai/sdk";
import {
  getAnthropicRequestRetryAttempts,
  getAnthropicRequestRetryDelayMs,
  getAnthropicRequestTimeoutMs,
  getModelFallbacks,
} from "@/lib/config/env";
import { createAbortTimeout } from "@/lib/chat/disposability";

export interface StreamCallbacks {
  onDelta?: (text: string) => void;
  onToolCall?: (name: string, args: Record<string, unknown>) => void;
  onToolResult?: (name: string, result: unknown) => void;
}

export interface ClaudeAgentLoopToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ClaudeAgentLoopToolResult {
  name: string;
  result: unknown;
  isError: boolean;
}

export interface ClaudeAgentLoopResult {
  model: string;
  assistantText: string;
  stopReason: string | null;
  toolRoundCount: number;
  toolCalls: ClaudeAgentLoopToolCall[];
  toolResults: ClaudeAgentLoopToolResult[];
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected provider error.";
}

function isModelNotFoundError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return message.includes("not_found_error") || message.includes("model:");
}

function isTransientProviderError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("timed out")
    || message.includes("timeout")
    || message.includes("rate limit")
    || message.includes("429")
    || message.includes("500")
    || message.includes("502")
    || message.includes("503")
    || message.includes("network")
    || message.includes("fetch failed")
    || message.includes("temporarily unavailable")
  );
}

export async function runClaudeAgentLoopStream({
  apiKey,
  messages,
  callbacks,
  maxToolRounds = 4,
  signal,
  systemPrompt,
  tools,
  toolExecutor,
  client,
  modelCandidates,
  retryAttempts = getAnthropicRequestRetryAttempts(),
  retryDelayMs = getAnthropicRequestRetryDelayMs(),
  timeoutMs = getAnthropicRequestTimeoutMs(),
}: {
  apiKey: string;
  messages: Anthropic.MessageParam[];
  callbacks: StreamCallbacks;
  maxToolRounds?: number;
  signal?: AbortSignal;
  systemPrompt: string;
  tools: Anthropic.Tool[];
  toolExecutor: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  client?: Anthropic;
  modelCandidates?: string[];
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}): Promise<ClaudeAgentLoopResult> {
  const models = modelCandidates ?? getModelFallbacks();

  if (models.length === 0) {
    throw new Error("No valid Anthropic model configured.");
  }

  const anthropicClient = client ?? new Anthropic({ apiKey });

  const anthropicTools: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description || "",
    input_schema: t.input_schema || { type: "object", properties: {} },
  }));

  let lastError: unknown;

  for (const model of models) {
    const conversation = [...messages];
    const toolCalls: ClaudeAgentLoopToolCall[] = [];
    const toolResults: ClaudeAgentLoopToolResult[] = [];
    let assistantText = "";
    let stopReason: string | null = null;
    let round = 0;

    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
      try {
        while (round < maxToolRounds) {
          round++;
          if (signal?.aborted) {
            stopReason = "aborted";
            break;
          }

          const timeout = createAbortTimeout(timeoutMs);
          const requestSignal = signal
            ? AbortSignal.any([signal, timeout.controller.signal])
            : timeout.controller.signal;

          let stream: ReturnType<typeof anthropicClient.messages.stream>;
          try {
            stream = anthropicClient.messages.stream(
              {
                model,
                max_tokens: 2048,
                system: systemPrompt,
                messages: conversation,
                tools: anthropicTools,
              },
              { signal: requestSignal },
            );

            stream.on("text", (text: string) => {
              assistantText += text;
              callbacks.onDelta?.(text);
            });

            const response = await stream.finalMessage();
            stopReason = response.stop_reason;

            if (response.stop_reason !== "tool_use") {
              timeout.clear();
              break;
            }

            const toolUseBlocks = response.content.filter(
              (block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock => block.type === "tool_use",
            );

            if (toolUseBlocks.length === 0) {
              timeout.clear();
              stopReason = "tool_use_without_blocks";
              break;
            }

            conversation.push({ role: "assistant", content: response.content });

            const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

            for (const use of toolUseBlocks) {
              const args = use.input as Record<string, unknown>;
              toolCalls.push({ name: use.name, args });
              callbacks.onToolCall?.(use.name, args);

              let resultBlock: Anthropic.Messages.ToolResultBlockParam;
              let isError = false;
              try {
                const result = await toolExecutor(use.name, args);
                const content = typeof result === "string" ? result : JSON.stringify(result);
                resultBlock = { type: "tool_result", tool_use_id: use.id, content };
              } catch (error) {
                isError = true;
                resultBlock = {
                  type: "tool_result",
                  tool_use_id: use.id,
                  content: error instanceof Error ? error.message : "Tool execution failed.",
                  is_error: true,
                };
              }

              let finalResult: unknown = resultBlock.content;
              if (typeof resultBlock.content === "string") {
                try {
                  finalResult = JSON.parse(resultBlock.content);
                } catch {
                  // Leave non-JSON tool content as-is.
                }
              }

              callbacks.onToolResult?.(use.name, finalResult);
              toolResults.push({ name: use.name, result: finalResult, isError });
              toolResultContents.push(resultBlock);
            }

            conversation.push({ role: "user", content: toolResultContents });
            timeout.clear();
          } catch (error) {
            timeout.clear();

            if (timeout.controller.signal.aborted && !signal?.aborted) {
              throw new Error(`Provider request timed out after ${timeoutMs}ms.`);
            }

            throw error;
          }
        }

        if (stopReason === "tool_use" && round >= maxToolRounds) {
          stopReason = "max_tool_rounds_exhausted";
        }

        return {
          model,
          assistantText,
          stopReason,
          toolRoundCount: round,
          toolCalls,
          toolResults,
        };
      } catch (error) {
        if (isModelNotFoundError(error)) {
          lastError = error;
          break;
        }

        if (isTransientProviderError(error) && attempt < retryAttempts) {
          lastError = error;
          await delay(retryDelayMs * attempt);
          continue;
        }

        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("No valid Anthropic model configured.");
}

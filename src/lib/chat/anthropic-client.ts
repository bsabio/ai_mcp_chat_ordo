import type Anthropic from "@anthropic-ai/sdk";
import { getModelFallbacks } from "@/lib/config/env";
import type { ToolChoice } from "@/lib/chat/types";
import { ChatProviderError } from "@/lib/chat/provider-decorators";

export type ChatProvider = {
  createMessage(args: {
    messages: Anthropic.MessageParam[];
    toolChoice: ToolChoice;
  }): Promise<Anthropic.Message>;
};

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 150;

export type AnthropicResilienceOptions = {
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
};

type ErrorHandlingContext = {
  error: unknown;
  attempt: number;
  retryAttempts: number;
};

type ErrorHandlingAction =
  | { type: "next-model" }
  | { type: "retry" }
  | { type: "throw"; error: Error };

type ErrorHandler = (
  context: ErrorHandlingContext,
) => ErrorHandlingAction | null;

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error("Provider request timed out.")),
        timeoutMs,
      );
    }),
  ]);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected provider error.";
}

function isModelNotFoundError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return message.includes("not_found_error") || message.includes("model:");
}

function isTimeoutError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return message.includes("timed out") || message.includes("timeout");
}

function isTransientProviderError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("temporarily unavailable")
  );
}

function normalizeProviderError(error: unknown): Error {
  return new ChatProviderError(
    `Anthropic provider error: ${toErrorMessage(error)}`,
    error,
  );
}

const modelNotFoundHandler: ErrorHandler = ({ error }) => {
  if (isModelNotFoundError(error)) {
    return { type: "next-model" };
  }

  return null;
};

const transientRetryHandler: ErrorHandler = ({
  error,
  attempt,
  retryAttempts,
}) => {
  // Timeouts with the same payload are not transient — the request
  // will always be slow.  Fail fast instead of amplifying the wait.
  if (isTimeoutError(error)) {
    return null;
  }

  if (isTransientProviderError(error) && attempt < retryAttempts) {
    return { type: "retry" };
  }

  return null;
};

const defaultThrowHandler: ErrorHandler = ({ error }) => {
  return { type: "throw", error: normalizeProviderError(error) };
};

const errorHandlerChain: ErrorHandler[] = [
  modelNotFoundHandler,
  transientRetryHandler,
  defaultThrowHandler,
];

function resolveErrorAction(
  context: ErrorHandlingContext,
): ErrorHandlingAction {
  for (const handler of errorHandlerChain) {
    const action = handler(context);
    if (action) {
      return action;
    }
  }

  return { type: "throw", error: normalizeProviderError(context.error) };
}

export async function createMessageWithModelFallback({
  client,
  messages,
  toolChoice,
  options,
  systemPrompt,
  tools,
}: {
  client: Anthropic;
  messages: Anthropic.MessageParam[];
  toolChoice: ToolChoice;
  options?: AnthropicResilienceOptions;
  systemPrompt: string;
  tools: Anthropic.Tool[];
}): Promise<Anthropic.Message> {
  const models = getModelFallbacks();
  let lastError: unknown;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryAttempts = options?.retryAttempts ?? DEFAULT_RETRY_ATTEMPTS;
  const retryDelayMs = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  for (const model of models) {
    for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
      try {
        const response = (await withTimeout(
          client.messages.create({
            model,
            max_tokens: 2048,
            system: systemPrompt,
            messages,
            tools,
            tool_choice: toolChoice,
          }),
          timeoutMs,
        )) as Anthropic.Message;

        return response;
      } catch (error) {
        const action = resolveErrorAction({
          error,
          attempt,
          retryAttempts,
        });

        if (action.type === "next-model") {
          lastError = error;
          break;
        }

        if (action.type === "retry") {
          await delay(retryDelayMs * attempt);
          continue;
        }

        throw action.error;
      }
    }
  }

  if (lastError) {
    throw normalizeProviderError(lastError);
  }

  throw new Error(
    "No valid Anthropic model found. Set ANTHROPIC_MODEL/API__ANTHROPIC_MODEL to a valid model alias.",
  );
}

export function createAnthropicProvider(
  client: Anthropic,
  config: {
    systemPrompt: string;
    tools: Anthropic.Tool[];
    resilience?: AnthropicResilienceOptions;
  },
): ChatProvider {
  return {
    createMessage: ({ messages, toolChoice }) =>
      createMessageWithModelFallback({
        client,
        messages,
        toolChoice,
        options: config.resilience,
        systemPrompt: config.systemPrompt,
        tools: config.tools,
      }),
  };
}

import Anthropic from "@anthropic-ai/sdk";

import type { RoleName, User } from "@/core/entities/user";
import { UserPreferencesDataMapper } from "@/adapters/UserPreferencesDataMapper";
import { getDb } from "@/lib/db";
import {
  getAnthropicApiKey,
  getAnthropicRequestRetryAttempts,
  getAnthropicRequestRetryDelayMs,
  getAnthropicRequestTimeoutMs,
} from "@/lib/config/env";
import { createSystemPromptBuilder } from "@/lib/chat/policy";
import { orchestrateChatTurn } from "@/lib/chat/orchestrator";
import {
  getLatestUserMessage,
  toAnthropicMessages,
} from "@/lib/chat/validation";
import { createAnthropicProvider } from "@/lib/chat/anthropic-client";
import {
  withProviderErrorMapping,
  withProviderTiming,
} from "@/lib/chat/provider-decorators";
import { logEvent } from "@/lib/observability/logger";
import {
  getToolComposition,
} from "@/lib/chat/tool-composition-root";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import { looksLikeMath } from "@/lib/chat/math-classifier";

type ChatRequestUser = Pick<User, "id" | "roles">;

interface ExecuteDirectChatTurnOptions {
  incomingMessages: Array<{ role: "user" | "assistant"; content: string }>;
  user: ChatRequestUser;
  route: string;
  requestId: string;
}

export async function executeDirectChatTurn({
  incomingMessages,
  user,
  route,
  requestId,
}: ExecuteDirectChatTurnOptions): Promise<string> {
  const latestUserMessage = getLatestUserMessage(incomingMessages);
  const apiKey = getAnthropicApiKey();
  const conversation = toAnthropicMessages(incomingMessages);
  const role = user.roles[0] as RoleName;
  const builder = await createSystemPromptBuilder(role);

  if (!user.roles.includes("ANONYMOUS")) {
    const prefRepo = new UserPreferencesDataMapper(getDb());
    const userPrefs = await prefRepo.getAll(user.id);
    builder.withUserPreferences(userPrefs);
  }

  const systemPrompt = builder.build();
  const { registry, executor } = getToolComposition();
  const tools = registry.getSchemasForRole(role) as Anthropic.Tool[];
  const resilience = {
    timeoutMs: getAnthropicRequestTimeoutMs(),
    retryAttempts: getAnthropicRequestRetryAttempts(),
    retryDelayMs: getAnthropicRequestRetryDelayMs(),
  };

  const toolContext: ToolExecutionContext = {
    role,
    userId: user.id,
  };
  const toolExecutor = (name: string, input: Record<string, unknown>) =>
    executor(name, input, toolContext);

  const client = new Anthropic({ apiKey });
  const provider = withProviderTiming(
    withProviderErrorMapping(
      createAnthropicProvider(client, {
        systemPrompt,
        tools,
        resilience,
      }),
    ),
    ({ durationMs, isError }) => {
      logEvent("info", "provider.call", {
        route,
        requestId,
        durationMs,
        isError,
        timeoutMs: resilience.timeoutMs,
        retryAttempts: resilience.retryAttempts,
        retryDelayMs: resilience.retryDelayMs,
      });
    },
  );

  const toolChoice:
    | { type: "auto" }
    | { type: "tool"; name: "calculator" } = looksLikeMath(
    latestUserMessage,
  )
    ? { type: "tool", name: "calculator" }
    : { type: "auto" };

  return orchestrateChatTurn({
    provider,
    conversation,
    toolChoice,
    toolExecutor,
  });
}
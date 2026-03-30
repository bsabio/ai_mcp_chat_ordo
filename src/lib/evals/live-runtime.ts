import type Anthropic from "@anthropic-ai/sdk";

import type { RoleName } from "@/core/entities/user";
import { buildSystemPrompt } from "@/lib/chat/policy";
import { getToolComposition } from "@/lib/chat/tool-composition-root";
import { runClaudeAgentLoopStream, type ClaudeAgentLoopResult } from "@/lib/chat/anthropic-stream";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";

export interface LiveEvalRuntimeRequest {
  apiKey: string;
  role: RoleName;
  userId: string;
  messages: Anthropic.MessageParam[];
  maxToolRounds?: number;
  signal?: AbortSignal;
  systemPrompt?: string;
  tools?: Anthropic.Tool[];
  toolExecutor?: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  invokeStream?: typeof runClaudeAgentLoopStream;
}

export interface LiveEvalRuntimeResult extends ClaudeAgentLoopResult {
  systemPrompt: string;
  toolCount: number;
}

export async function executeLiveEvalRuntime(
  request: LiveEvalRuntimeRequest,
): Promise<LiveEvalRuntimeResult> {
  const { registry, executor } = getToolComposition();
  const systemPrompt = request.systemPrompt ?? await buildSystemPrompt(request.role);
  const tools = request.tools ?? (registry.getSchemasForRole(request.role) as Anthropic.Tool[]);
  const execContext: ToolExecutionContext = {
    role: request.role,
    userId: request.userId,
  };
  const toolExecutor = request.toolExecutor
    ?? ((name: string, input: Record<string, unknown>) => executor(name, input, execContext));
  const invokeStream = request.invokeStream ?? runClaudeAgentLoopStream;

  const result = await invokeStream({
    apiKey: request.apiKey,
    messages: request.messages,
    callbacks: {},
    maxToolRounds: request.maxToolRounds,
    signal: request.signal,
    systemPrompt,
    tools,
    toolExecutor,
  });

  return {
    ...result,
    systemPrompt,
    toolCount: tools.length,
  };
}

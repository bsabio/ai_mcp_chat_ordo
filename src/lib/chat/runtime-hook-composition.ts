import { LoggingMiddleware } from "@/core/tool-registry/LoggingMiddleware";
import type { ChatRuntimeHook } from "@/lib/chat/runtime-hooks";

export function getChatRuntimeHooks(): readonly ChatRuntimeHook[] {
  return [new LoggingMiddleware()];
}
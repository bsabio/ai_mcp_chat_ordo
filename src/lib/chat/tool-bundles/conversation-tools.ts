import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import { getVectorStore } from "@/adapters/RepositoryFactory";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface ConversationToolRegistrationDeps {
  readonly vectorStore: ReturnType<typeof getVectorStore>;
}

const CONVERSATION_TOOL_REGISTRATIONS = [
  {
    toolName: "search_my_conversations",
    createTool: ({ vectorStore }) => projectCatalogBoundToolDescriptor("search_my_conversations", { vectorStore }),
  },
] as const satisfies readonly ToolBundleRegistration<
  "search_my_conversations",
  ConversationToolRegistrationDeps
>[];

export const CONVERSATION_BUNDLE = createRegisteredToolBundle(
  "conversation",
  "Conversation Tools",
  CONVERSATION_TOOL_REGISTRATIONS,
);

export function registerConversationTools(registry: ToolRegistry): void {
  registerToolBundle(registry, CONVERSATION_TOOL_REGISTRATIONS, {
    vectorStore: getVectorStore(),
  });
}

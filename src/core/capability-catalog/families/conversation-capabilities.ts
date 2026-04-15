import type { CapabilityDefinition } from "../capability-definition";
import { CATALOG_INPUT_SCHEMAS } from "../catalog-input-schemas";
import { SIGNED_IN_ROLES } from "./shared";

const SEARCH_MY_CONVERSATIONS_PROMPT_LINE =
  "You have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'";

export const CONVERSATION_CAPABILITIES = {
  search_my_conversations: {
    core: {
      name: "search_my_conversations",
      label: "Search My Conversations",
      description: "Search your own conversation history to recall past discussions.",
      category: "system",
      roles: [...SIGNED_IN_ROLES],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.search_my_conversations,
      outputHint: "Returns matching conversation excerpts",
    },
    runtime: {},
    executorBinding: {
      bundleId: "conversation",
      executorId: "search_my_conversations",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "search_my_conversations",
      mode: "parse",
    },
    presentation: {
      family: "search",
      cardKind: "search_result",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        AUTHENTICATED: [SEARCH_MY_CONVERSATIONS_PROMPT_LINE],
        APPRENTICE: [SEARCH_MY_CONVERSATIONS_PROMPT_LINE],
        STAFF: [SEARCH_MY_CONVERSATIONS_PROMPT_LINE],
        ADMIN: [
          "You also have access to `search_my_conversations` to recall past discussion topics. Use it when the user references something discussed previously or asks 'what did we talk about.'",
        ],
      },
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;
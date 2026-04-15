import OpenAI from "openai";

import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import {
  emitProviderEvent,
  classifyProviderError,
} from "@/lib/chat/provider-policy";
import { getOpenaiApiKey } from "@/lib/config/env";
import {
  sanitizeAdminWebSearchInput,
  toAdminWebSearchPayload,
  type AdminWebSearchPayload,
  type WebSearchInput,
} from "@/lib/web-search/admin-web-search-payload";
import {
  adminWebSearch,
  validateAdminWebSearchArgs,
  type WebSearchError,
  type WebSearchToolDeps,
} from "@/lib/capabilities/shared/web-search-tool";

function createWebSearchDeps(): WebSearchToolDeps {
  return {
    openai: new OpenAI({ apiKey: getOpenaiApiKey() }),
  };
}

function toWebSearchError(error: unknown): WebSearchError {
  if (error && typeof error === "object") {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "Unknown error";
    const code =
      "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;

    return code === undefined
      ? { error: message }
      : { error: message, code };
  }

  return {
    error: error instanceof Error ? error.message : "Unknown error",
  };
}

export async function executeAdminWebSearch(
  input: WebSearchInput,
  depsFactory: () => WebSearchToolDeps = createWebSearchDeps,
): Promise<AdminWebSearchPayload> {
  const validationError = validateAdminWebSearchArgs(input);
  if (validationError) {
    return toAdminWebSearchPayload(input, validationError);
  }

  const model = input.model ?? "gpt-5";
  const startTime = Date.now();

  emitProviderEvent({
    kind: "attempt_start",
    surface: "web_search",
    model,
    attempt: 1,
  });

  try {
    const result = await adminWebSearch(depsFactory(), input);

    emitProviderEvent({
      kind: "attempt_success",
      surface: "web_search",
      model,
      attempt: 1,
      durationMs: Date.now() - startTime,
    });

    return toAdminWebSearchPayload(input, result);
  } catch (error) {
    emitProviderEvent({
      kind: "attempt_failure",
      surface: "web_search",
      model,
      attempt: 1,
      durationMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      errorClassification: classifyProviderError(error),
    });

    return toAdminWebSearchPayload(input, toWebSearchError(error));
  }
}

export function createAdminWebSearchTool(
  depsFactory: () => WebSearchToolDeps = createWebSearchDeps,
){
  return buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.admin_web_search, {
    parse: sanitizeAdminWebSearchInput,
    execute: (input) => executeAdminWebSearch(input, depsFactory),
  });
}

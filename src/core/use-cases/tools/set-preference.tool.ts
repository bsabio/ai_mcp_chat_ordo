import { CAPABILITY_CATALOG } from "@/core/capability-catalog/catalog";
import { buildCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-projection";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";

export const SUPPORTED_PREFERENCE_KEYS = [
  "response_style",
  "tone",
  "business_context",
  "preferred_name",
] as const;

export interface SetPreferenceInput {
  key: (typeof SUPPORTED_PREFERENCE_KEYS)[number];
  value: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSetPreferenceInput(value: unknown): SetPreferenceInput {
  if (!isRecord(value)) {
    throw new Error("set_preference input must be an object.");
  }

  if (typeof value.key !== "string" || !SUPPORTED_PREFERENCE_KEYS.includes(value.key as SetPreferenceInput["key"])) {
    throw new Error(`set_preference key must be one of: ${SUPPORTED_PREFERENCE_KEYS.join(", ")}.`);
  }

  if (typeof value.value !== "string") {
    throw new Error("set_preference value must be a string.");
  }

  return {
    key: value.key as SetPreferenceInput["key"],
    value: value.value,
  };
}

export class SetPreferenceCommand
  implements ToolCommand<SetPreferenceInput, string>
{
  constructor(private readonly repo: UserPreferencesRepository) {}

  async execute(
    input: SetPreferenceInput,
    context?: ToolExecutionContext,
  ): Promise<string> {
    const { key, value } = input;

    if (!context || context.role === "ANONYMOUS") {
      return JSON.stringify({
        error: "Authentication required to save preferences.",
      });
    }

    await this.repo.set(context.userId, key, value);

    return JSON.stringify({
      action: "set_preference",
      key,
      value,
      message: `Preference "${key}" set to "${value}". This will be remembered across sessions.`,
    });
  }
}

export async function executeSetPreference(
  repo: UserPreferencesRepository,
  input: SetPreferenceInput,
  context?: ToolExecutionContext,
): Promise<string> {
  return new SetPreferenceCommand(repo).execute(input, context);
}

export function createSetPreferenceTool(repo: UserPreferencesRepository) {
  return buildCatalogBoundToolDescriptor(CAPABILITY_CATALOG.set_preference, {
    parse: parseSetPreferenceInput,
    execute: (input, context) => executeSetPreference(repo, input, context),
  });
}

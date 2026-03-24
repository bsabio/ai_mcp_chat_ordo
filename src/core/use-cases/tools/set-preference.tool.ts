import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";

export class SetPreferenceCommand
  implements ToolCommand<Record<string, unknown>, string>
{
  constructor(private readonly repo: UserPreferencesRepository) {}

  async execute(
    input: Record<string, unknown>,
    context?: ToolExecutionContext,
  ): Promise<string> {
    const key = String(input.key ?? "");
    const value = String(input.value ?? "");

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

export function createSetPreferenceTool(repo: UserPreferencesRepository): ToolDescriptor {
  return {
    name: "set_preference",
    schema: {
      description:
        "Set a user preference that persists across sessions and devices. Use for non-UI preferences like tone, response style, business context, or preferred name. When a user says 'remember that I prefer concise answers' or 'call me Keith', use this tool.",
      input_schema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            enum: [
              "response_style",
              "tone",
              "business_context",
              "preferred_name",
            ],
            description: "The preference key to set.",
          },
          value: {
            type: "string",
            description:
              "The preference value. For response_style: concise|detailed|bullets. For tone: professional|casual|friendly. For business_context: free text (max 500 chars). For preferred_name: free text (max 100 chars).",
          },
        },
        required: ["key", "value"],
      },
    },
    command: new SetPreferenceCommand(repo),
    roles: ["AUTHENTICATED", "STAFF", "ADMIN"],
    category: "system",
  };
}

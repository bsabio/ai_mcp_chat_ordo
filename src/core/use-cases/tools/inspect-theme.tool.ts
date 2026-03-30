import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { ToolCommand } from "@/core/tool-registry/ToolCommand";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";
import {
  SUPPORTED_THEME_IDS,
  THEME_CONTROL_AXES,
  type ManifestThemeId,
} from "@/lib/theme/theme-manifest";
import { ThemeManagementInteractor } from "@/core/use-cases/ThemeManagementInteractor";

type InspectThemeToolResult = {
  action: "inspect_theme";
  message: string;
  supported_theme_ids: readonly ManifestThemeId[];
  ordered_theme_profiles: readonly ReturnType<ThemeManagementInteractor["getThemeMetadata"]>[];
  approved_control_axes: typeof THEME_CONTROL_AXES;
  active_theme_state: {
    available: false;
    reason: string;
  };
};

class InspectThemeCommand implements ToolCommand<Record<string, never>, InspectThemeToolResult> {
  constructor(private readonly themeInteractor: ThemeManagementInteractor) {}

  async execute(
    _input: Record<string, never>,
    _context?: ToolExecutionContext,
  ): Promise<InspectThemeToolResult> {
    return {
      action: "inspect_theme",
      message:
        "Returned the manifest-backed supported theme profiles and bounded control metadata. Active theme state is unavailable from this server-side execution path.",
      supported_theme_ids: SUPPORTED_THEME_IDS,
      ordered_theme_profiles: this.themeInteractor.getAllThemes(),
      approved_control_axes: THEME_CONTROL_AXES,
      active_theme_state: {
        available: false,
        reason:
          "Active theme selection is applied in the client runtime and is not reliably observable from this tool execution path.",
      },
    };
  }
}

export function createInspectThemeTool(
  themeInteractor = new ThemeManagementInteractor(),
): ToolDescriptor<Record<string, never>, InspectThemeToolResult> {
  return {
    name: "inspect_theme",
    schema: {
      description:
        "Inspect the supported theme profiles and bounded UI control axes. This is read-only and does not mutate theme or accessibility state.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    command: new InspectThemeCommand(themeInteractor),
    roles: "ALL",
    category: "ui",
  };
}
import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import { SUPPORTED_THEME_IDS } from "@/lib/theme/theme-manifest";
import { SetThemeCommand } from "./UiTools";

export const setThemeTool: ToolDescriptor = {
  name: "set_theme",
  schema: {
    description: "Change site aesthetic era.",
    input_schema: {
      type: "object",
      properties: {
        theme: { type: "string", enum: [...SUPPORTED_THEME_IDS] },
      },
      required: ["theme"],
    },
  },
  command: new SetThemeCommand(),
  roles: "ALL",
  category: "ui",
};

import type { ToolDescriptor } from "@/core/tool-registry/ToolDescriptor";
import type { UserPreferencesRepository } from "@/core/ports/UserPreferencesRepository";
import {
  SUPPORTED_COLOR_BLIND_MODES,
  SUPPORTED_DENSITY_LEVELS,
  SUPPORTED_FONT_SIZES,
  SUPPORTED_SPACING_LEVELS,
  SUPPORTED_THEME_IDS,
  SUPPORTED_UI_PRESET_IDS,
} from "@/lib/theme/theme-manifest";
import { AdjustUICommand } from "./UiTools";

export function createAdjustUiTool(repo?: UserPreferencesRepository): ToolDescriptor {
  return {
    name: "adjust_ui",
    schema: {
      description: "Adjust the UI appearance for accessibility, comfort, or user preference. Use when users say things like 'make text bigger', 'I'm old', 'too bright', 'I'm color blind', 'compact mode', or 'hard to read'. You can apply a named preset OR set individual properties. Presets: 'elderly' (large text, relaxed spacing), 'compact' (dense info), 'high-contrast' (dark + large), 'color-blind-deuteranopia', 'color-blind-protanopia', 'color-blind-tritanopia', 'default' (reset all).",
      input_schema: {
        type: "object",
        properties: {
          preset: { type: "string", enum: [...SUPPORTED_UI_PRESET_IDS], description: "Apply a curated preset. Overrides individual settings." },
          fontSize: { type: "string", enum: [...SUPPORTED_FONT_SIZES], description: "Base font size." },
          lineHeight: { type: "string", enum: [...SUPPORTED_SPACING_LEVELS], description: "Line spacing." },
          letterSpacing: { type: "string", enum: [...SUPPORTED_SPACING_LEVELS], description: "Letter spacing." },
          density: { type: "string", enum: [...SUPPORTED_DENSITY_LEVELS], description: "UI density — affects padding and gaps." },
          dark: { type: "boolean", description: "Enable or disable dark mode." },
          theme: { type: "string", enum: [...SUPPORTED_THEME_IDS], description: "Visual theme era." },
          colorBlindMode: { type: "string", enum: [...SUPPORTED_COLOR_BLIND_MODES], description: "Color-blind safe palette." },
        },
      },
    },
    command: new AdjustUICommand(repo),
    roles: "ALL",
    category: "ui",
  };
}

import type { Theme } from "./theme";

export const UI_COMMAND_TYPE = {
  SET_THEME: "set_theme",
  NAVIGATE: "navigate",
  ADJUST_UI: "adjust_ui",
} as const;

export interface UIAdjustmentSettings extends Record<string, unknown> {
  theme?: Theme;
}

export type UICommand =
  | { type: typeof UI_COMMAND_TYPE.SET_THEME; theme: Theme }
  | { type: typeof UI_COMMAND_TYPE.NAVIGATE; path: string }
  | { type: typeof UI_COMMAND_TYPE.ADJUST_UI; settings: UIAdjustmentSettings };

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme, type Theme, type AccessibilitySettings, type FontSize, type SpacingLevel, type Density, type ColorBlindMode, type UIPreset, UI_PRESETS } from "@/components/ThemeProvider";
import { getSupportedTheme } from "@/lib/theme/theme-manifest";
import type { PresentedMessage } from "../adapters/ChatPresenter";

export function useUICommands(
  presentedMessages: PresentedMessage[],
  isLoadingMessages = false,
) {
  const router = useRouter();
  const { setTheme, setIsDark, accessibility, setAccessibility } = useTheme();
  const executedCommandKeysRef = useRef<Set<string>>(new Set());
  const hasEstablishedBaselineRef = useRef(false);

  useEffect(() => {
    const assistantMessages = presentedMessages.filter((message) => message.role === "assistant");
    if (isLoadingMessages) {
      executedCommandKeysRef.current = new Set(
        assistantMessages.flatMap((message) =>
          message.commands.map((cmd) => `${message.id}-${JSON.stringify(cmd)}`),
        ),
      );
      hasEstablishedBaselineRef.current = false;
      return;
    }

    if (!hasEstablishedBaselineRef.current) {
      executedCommandKeysRef.current = new Set(
        assistantMessages.flatMap((message) =>
          message.commands.map((cmd) => `${message.id}-${JSON.stringify(cmd)}`),
        ),
      );
      hasEstablishedBaselineRef.current = true;
      return;
    }

    assistantMessages.forEach((message) => {
      message.commands.forEach((cmd: Record<string, unknown>) => {
        const cmdKey = `${message.id}-${JSON.stringify(cmd)}`;
        if (executedCommandKeysRef.current.has(cmdKey)) {
          return;
        }

        executedCommandKeysRef.current.add(cmdKey);
        if (cmd.type === "set_theme") {
          const theme = getSupportedTheme(cmd.theme);
          if (theme) {
            setTheme(theme);
          }
        } else if (cmd.type === "navigate" && typeof cmd.path === "string") {
          if (cmd.path.startsWith("/")) router.push(cmd.path);
          else window.location.href = cmd.path;
        } else if (cmd.type === "adjust_ui") {
          const settings = cmd.settings as Record<string, unknown>;
          applyUIAdjustment(settings, accessibility, setAccessibility, setTheme, setIsDark);
        }
      });
    });
  }, [presentedMessages, isLoadingMessages, setTheme, setIsDark, accessibility, setAccessibility, router]);
}

function applyUIAdjustment(
  settings: Record<string, unknown>,
  current: AccessibilitySettings,
  setAccessibility: (s: AccessibilitySettings) => void,
  setTheme: (t: Theme) => void,
  setIsDark: (d: boolean) => void,
) {
  const acc = { ...current };

  // If a preset is specified, apply its values first
  if (settings.preset && typeof settings.preset === "string" && settings.preset in UI_PRESETS) {
    const preset = UI_PRESETS[settings.preset as UIPreset];
    if (preset.fontSize) acc.fontSize = preset.fontSize;
    if (preset.lineHeight) acc.lineHeight = preset.lineHeight;
    if (preset.letterSpacing) acc.letterSpacing = preset.letterSpacing;
    if (preset.density) acc.density = preset.density;
    if (preset.colorBlindMode) acc.colorBlindMode = preset.colorBlindMode;
    if (preset.dark !== undefined) setIsDark(preset.dark);
    if (preset.theme) setTheme(preset.theme);
  }

  // Individual overrides (take precedence over preset)
  if (settings.fontSize) acc.fontSize = settings.fontSize as FontSize;
  if (settings.lineHeight) acc.lineHeight = settings.lineHeight as SpacingLevel;
  if (settings.letterSpacing) acc.letterSpacing = settings.letterSpacing as SpacingLevel;
  if (settings.density) acc.density = settings.density as Density;
  if (settings.colorBlindMode) acc.colorBlindMode = settings.colorBlindMode as ColorBlindMode;
  if (settings.dark !== undefined) setIsDark(settings.dark as boolean);
  const theme = getSupportedTheme(settings.theme);
  if (theme) setTheme(theme);

  setAccessibility(acc);
}

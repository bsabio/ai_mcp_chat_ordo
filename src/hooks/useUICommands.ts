import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme, type Theme, type AccessibilitySettings, type FontSize, type SpacingLevel, type Density, type ColorBlindMode, type UIPreset, UI_PRESETS } from "@/components/ThemeProvider";
import type { PresentedMessage } from "../adapters/ChatPresenter";

export function useUICommands(
  presentedMessages: PresentedMessage[],
  isLoadingMessages = false,
) {
  const router = useRouter();
  const { setTheme, setIsDark, accessibility, setAccessibility } = useTheme();
  const lastExecutedCommandRef = useRef<string>("");
  const hasEstablishedBaselineRef = useRef(false);
  const seenAssistantMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const lastMsg = presentedMessages[presentedMessages.length - 1];
    if (isLoadingMessages) {
      seenAssistantMessageIdsRef.current = new Set(
        presentedMessages
          .filter((message) => message.role === "assistant")
          .map((message) => message.id),
      );
      hasEstablishedBaselineRef.current = false;
      return;
    }

    if (!hasEstablishedBaselineRef.current) {
      seenAssistantMessageIdsRef.current = new Set(
        presentedMessages
          .filter((message) => message.role === "assistant")
          .map((message) => message.id),
      );
      hasEstablishedBaselineRef.current = true;
      return;
    }

    if (!lastMsg || lastMsg.role !== "assistant") {
      return;
    }

    if (seenAssistantMessageIdsRef.current.has(lastMsg.id)) {
      return;
    }

    seenAssistantMessageIdsRef.current.add(lastMsg.id);

    if (lastMsg.commands.length === 0) {
      return;
    }

    lastMsg.commands.forEach((cmd: Record<string, unknown>) => {
      const cmdKey = `${lastMsg.id}-${JSON.stringify(cmd)}`;
      if (cmdKey === lastExecutedCommandRef.current) {
        return;
      }

      lastExecutedCommandRef.current = cmdKey;
      if (cmd.type === "set_theme") {
        setTheme(cmd.theme as Theme);
      } else if (cmd.type === "navigate" && typeof cmd.path === "string") {
        if (cmd.path.startsWith("/")) router.push(cmd.path);
        else window.location.href = cmd.path;
      } else if (cmd.type === "adjust_ui") {
        const settings = cmd.settings as Record<string, unknown>;
        applyUIAdjustment(settings, accessibility, setAccessibility, setTheme, setIsDark);
      }
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
  if (settings.theme) setTheme(settings.theme as Theme);

  setAccessibility(acc);
}

import { getModelFallbacks } from "@/lib/config/env";

export const SYSTEM_PROMPT = [
  "You are a Claude-based assistant.",
  "For ALL arithmetic and numeric calculations, you MUST use the calculator tool.",
  "Never do math mentally or directly in text when a calculation is needed.",
  "If a user asks for math, call calculator first, then explain the result.",
].join(" ");

export function looksLikeMath(text: string): boolean {
  const value = text.toLowerCase();

  return (
    /\d\s*[+\-*/]\s*\d/.test(value) ||
    /\b(add|subtract|minus|plus|sum|difference|multiply|times|product|divide|quotient|calculate|math)\b/.test(
      value,
    )
  );
}

export function getModelCandidates(): string[] {
  return getModelFallbacks();
}

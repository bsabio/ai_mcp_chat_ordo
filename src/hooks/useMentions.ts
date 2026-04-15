"use client";

import { useState, useCallback } from "react";
import type {
  MentionCategory} from "../core/entities/mentions";
import {
  PRACTITIONERS,
  CHAPTERS,
  FRAMEWORKS,
  type MentionItem
} from "../core/entities/mentions";

export type MentionTrigger = {
  char: string;
  category: MentionCategory;
};

export const TRIGGERS: MentionTrigger[] = [
  { char: "@", category: "practitioner" },
  { char: "[[", category: "chapter" },
  { char: "#", category: "framework" },
  { char: "/", category: "command" },
];

export function useMentions(
  _textareaRef: unknown,
  options?: {
    findCommands?: (query: string) => MentionItem[];
  },
) {
  const [activeTrigger, setActiveTrigger] = useState<MentionTrigger | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MentionItem[]>([]);

  const handleInput = useCallback(
    (text: string, cursorIndex: number) => {
      const textBeforeCursor = text.slice(0, cursorIndex);

      // Collect all valid trigger candidates (closest-to-cursor wins)
      type Candidate = { trigger: MentionTrigger; lastIndex: number; segment: string };
      const candidates: Candidate[] = [];

      for (const trigger of TRIGGERS) {
        const { char } = trigger;
        const lastIndex = textBeforeCursor.lastIndexOf(char);

        if (lastIndex !== -1) {
          const segment = textBeforeCursor.slice(lastIndex + char.length);
          if (!/\s/.test(segment)) {
            candidates.push({ trigger, lastIndex, segment });
          }
        }
      }

      if (candidates.length === 0) {
        setActiveTrigger(null);
        setQuery("");
        setSuggestions([]);
        return;
      }

      // Pick the candidate closest to cursor; tie-break by longer trigger char
      const winner = candidates.reduce((best, cur) =>
        cur.lastIndex > best.lastIndex
          ? cur
          : cur.lastIndex === best.lastIndex && cur.trigger.char.length > best.trigger.char.length
            ? cur
            : best,
      );

      setActiveTrigger(winner.trigger);
      setQuery(winner.segment);

      let filtered: MentionItem[] = [];

      if (winner.trigger.char === "/") {
        filtered = options?.findCommands?.(winner.segment) ?? [];
      } else {
        const source =
          winner.trigger.category === "practitioner"
            ? PRACTITIONERS
            : winner.trigger.category === "chapter"
              ? CHAPTERS
              : FRAMEWORKS;

        filtered = source.filter((item) =>
          item.name.toLowerCase().includes(winner.segment.toLowerCase()),
        );
      }
      setSuggestions(filtered);
    },
    [options],
  );

  const insertMention = useCallback(
    (item: MentionItem, currentText: string, cursorIndex: number) => {
      if (!activeTrigger) return "";

      const textBeforeCursor = currentText.slice(0, cursorIndex);
      const lastIndex = textBeforeCursor.lastIndexOf(activeTrigger.char);

      const newText =
        currentText.slice(0, lastIndex) +
        (activeTrigger.char === "[["
          ? `[[${item.name}]]`
          : `${activeTrigger.char}${item.name}`) +
        " " +
        currentText.slice(cursorIndex);

      setActiveTrigger(null);
      setQuery("");
      setSuggestions([]);

      return newText;
    },
    [activeTrigger],
  );

  return {
    activeTrigger,
    query,
    suggestions,
    handleInput,
    insertMention,
  };
}

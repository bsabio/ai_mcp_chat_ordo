"use client";

import React from "react";
import type { MentionItem } from "../core/entities/mentions";
import { 
  MentionStrategyRegistry, 
  PractitionerMentionStrategy, 
  ChapterMentionStrategy, 
  FrameworkMentionStrategy 
} from "../adapters/mentions/MentionStrategy";

interface MentionsMenuProps {
  suggestions: MentionItem[];
  onSelect: (item: MentionItem) => void;
  activeIndex: number;
}

const registry = new MentionStrategyRegistry([
  new PractitionerMentionStrategy(),
  new ChapterMentionStrategy(),
  new FrameworkMentionStrategy()
]);

export default function MentionsMenu({
  suggestions,
  onSelect,
  activeIndex,
}: MentionsMenuProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-[calc(100%+0.75rem)] z-[100] mx-auto w-full max-w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-[24px] border-theme bg-surface shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="listbox"
      aria-label="Mention suggestions"
    >
      <div className="px-(--space-3) py-(--space-2) border-b border-border bg-surface-muted flex items-center justify-between">
        <span className="text-label opacity-50">
          Suggestions
        </span>
        <span className="text-[9px] opacity-40 font-mono">
          TAB / ↑↓
        </span>
      </div>
      <div className="max-h-80 overflow-y-auto p-(--space-2) flex flex-col gap-(--space-1)">
        {suggestions.map((item, index) => {
          const strategy = registry.getStrategy(item);
          return (
            <button
              key={item.id}
              id={`mention-option-${index}`}
              onClick={() => onSelect(item)}
              tabIndex={-1}
              className={`focus-ring flex min-h-12 w-full items-start gap-(--space-3) rounded-lg px-(--space-3) py-(--space-3) text-left transition-all ${
                index === activeIndex
                  ? "accent-interactive-fill shadow-lg shadow-accent-interactive/20"
                  : "hover-surface"
              }`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <span className="text-base mt-(--space-1) shrink-0">
                {strategy?.getIcon() || "❓"}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate tracking-tight">
                  {item.name}
                </span>
                <span
                  className={`text-[10px] truncate mt-(--space-1) ${index === activeIndex ? "text-current" : ""}`}
                >
                  {strategy?.renderDescription(item)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

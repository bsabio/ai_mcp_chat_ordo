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
      className="absolute z-[100] w-72 bg-[var(--surface)] border-theme rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        bottom: "calc(100% + 8px)",
        left: "12px",
      }}
    >
      <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--surface-muted)] flex items-center justify-between">
        <span className="text-label opacity-50">
          Suggestions
        </span>
        <span className="text-[9px] opacity-40 font-mono">
          TAB / ↑↓
        </span>
      </div>
      <div className="max-h-80 overflow-y-auto p-1.5 flex flex-col gap-1">
        {suggestions.map((item, index) => {
          const strategy = registry.getStrategy(item);
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`flex items-start gap-3 w-full px-3 py-3 rounded-lg text-left transition-all ${
                index === activeIndex
                  ? "accent-fill shadow-lg shadow-[var(--accent-color)]/20"
                  : "hover-surface"
              }`}
            >
              <span className="text-base mt-0.5 shrink-0">
                {strategy?.getIcon() || "❓"}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate tracking-tight">
                  {item.name}
                </span>
                <span
                  className={`text-[10px] truncate mt-0.5 ${index === activeIndex ? "text-current" : ""}`}
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

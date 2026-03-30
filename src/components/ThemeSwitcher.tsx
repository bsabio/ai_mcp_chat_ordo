"use client";

import { useTheme } from "./ThemeProvider";
import { THEME_SELECTOR_OPTIONS } from "@/lib/theme/theme-manifest";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-(--space-2)">
      <div className="text-label opacity-50">
        Temporal Interface
      </div>
      <div className="flex flex-wrap gap-(--space-2)">
        {THEME_SELECTOR_OPTIONS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`
              rounded-md px-(--space-3) py-(--space-inset-tight) text-xs font-medium transition-all focus-ring
              ${
                theme === t.id
                  ? "accent-interactive-fill shadow-sm"
                  : "bg-surface-muted text-foreground opacity-70 hover:opacity-100 hover-surface"
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

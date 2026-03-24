import Image from "next/image";

import React from "react";

interface ChatHeaderProps {
  title: string;
  subtitle: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  density: "compact" | "normal" | "relaxed";
  onDensityChange: (density: "compact" | "normal" | "relaxed") => void;
  gridEnabled: boolean;
  onGridToggle: () => void;
  logoPath?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  density,
  onDensityChange,
  gridEnabled,
  onGridToggle,
  logoPath = "/ordo-avatar.png",
}) => {
  return (
    <header className="glass-surface sticky top-0 z-30 flex h-14 items-center justify-between border-b border-color-theme px-(--container-padding) shadow-[0_10px_30px_color-mix(in_srgb,var(--shadow-base)_8%,transparent)] transition-colors duration-500">
      <div className="shell-action-row">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-[0_8px_16px_-14px_color-mix(in_srgb,var(--shadow-base)_8%,transparent)]">
          <Image src={logoPath} alt="" width={32} height={32} className="object-cover" style={{ width: "100%", height: "100%" }} />
        </div>
        <div className="flex flex-col">
          <h1 className="shell-panel-heading leading-none">{title}</h1>
          <span className="shell-meta-text opacity-50">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="shell-action-row">
        {/* Search */}
        <div className="relative group hidden sm:block">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="absolute inset-s-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Filter session..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-surface-muted border-none rounded-full ps-9 pe-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-accent/20 w-40 transition-all focus:w-64"
          />
        </div>

        {/* Density */}
        <div className="shell-action-row rounded-full bg-surface-muted p-1">
          {(["compact", "normal", "relaxed"] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDensityChange(d)}
              className={`shell-micro-text flex h-7 w-7 items-center justify-center rounded-full transition-all ${density === d ? "accent-fill shadow-sm" : "hover-surface opacity-50"}`}
              title={`Density: ${d}`}
              aria-label={`Set density to ${d}`}
            >
              {d[0].toUpperCase()}
            </button>
          ))}
        </div>

        {/* Grid Toggle */}
        <button
          onClick={onGridToggle}
          className={`p-2 rounded-full transition-all ${gridEnabled ? "accent-fill" : "hover-surface"}`}
          title="Toggle Design Grid"
          aria-label="Toggle Design Grid"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
          </svg>
        </button>
      </div>
    </header>
  );
};

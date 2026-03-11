import React from "react";

interface ChatHeaderProps {
  title: string;
  subtitle: string;
  isFloating: boolean;
  onMinimize?: () => void;
  onFullScreenToggle: () => void;
  isFullScreen: boolean;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Density
  density: "compact" | "normal" | "relaxed";
  onDensityChange: (density: "compact" | "normal" | "relaxed") => void;

  // Grid
  gridEnabled: boolean;
  onGridToggle: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  isFloating,
  onMinimize,
  onFullScreenToggle,
  isFullScreen,
  searchQuery,
  onSearchChange,
  density,
  onDensityChange,
  gridEnabled,
  onGridToggle,
}) => {
  if (isFloating) {
    return (
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--background)]/75 backdrop-blur-xl shrink-0 relative z-10 transition-colors duration-500">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">{title}</h3>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider">
                PD Advisor
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onFullScreenToggle}
            className="icon-btn"
            aria-label={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}
          >
            {isFullScreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6" />
              </svg>
            )}
          </button>
          
          <button
            onClick={onMinimize}
            className="icon-btn"
            aria-label="Minimize Chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
      <header className="flex items-center justify-between px-6 h-14 border-b border-[var(--border-color)] bg-[var(--background)]/75 backdrop-blur-xl sticky top-0 z-30 transition-colors duration-500">
      <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full accent-fill flex items-center justify-center font-bold shadow-sm shadow-[var(--accent-color)]/20">
          A
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold leading-none">{title}</h1>
          <span className="text-label font-medium opacity-50">
            {subtitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative group hidden sm:block">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="absolute start-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Filter session..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[var(--surface-muted)] border-none rounded-full ps-9 pe-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 w-40 transition-all focus:w-64"
          />
        </div>

        {/* Density */}
        <div className="flex items-center gap-1 bg-[var(--surface-muted)] p-1 rounded-full">
          {(["compact", "normal", "relaxed"] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDensityChange(d)}
              className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-bold transition-all ${density === d ? "accent-fill shadow-sm" : "hover-surface opacity-50"}`}
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

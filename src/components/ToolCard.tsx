"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export interface ToolCardProps {
  title: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  status?: "idle" | "loading" | "success" | "error";
  actions?: ReactNode;
  onDownload?: () => void;
  downloadTooltip?: string;
  expandable?: boolean;
  thumbnailMode?: boolean;
  children: ReactNode;
  className?: string;
}

export function ToolCard({
  title,
  icon,
  subtitle,
  status = "idle",
  actions,
  onDownload,
  downloadTooltip = "Download",
  expandable = false,
  thumbnailMode = false,
  children,
  className = "",
}: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const renderModal = () => {
    return (
      <Dialog.Root open={isExpanded} onOpenChange={setIsExpanded}>
        <Dialog.Portal>
          <Dialog.Overlay className="glass-overlay fixed inset-0 z-99999 animate-in fade-in duration-200" />
          <Dialog.Content className="fixed inset-0 z-100000 flex items-start justify-center p-(--space-3) pt-[max(var(--space-inset-compact),var(--safe-area-inset-top))] pb-[max(var(--space-inset-compact),var(--safe-area-inset-bottom))] sm:p-(--space-inset-panel) sm:pt-[max(var(--space-6),var(--safe-area-inset-top))] sm:pb-[max(var(--space-6),var(--safe-area-inset-bottom))] outline-none">
            <div className="glass-surface flex max-h-full w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border-theme text-foreground shadow-[0_32px_90px_color-mix(in_srgb,var(--shadow-base)_20%,transparent)] animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-border bg-surface/80 p-(--space-inset-default) sm:p-(--space-inset-panel)">
                <div className="flex items-center gap-(--space-3)">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <Dialog.Title className="m-(--space-0) text-lg font-semibold">{title}</Dialog.Title>
                    {subtitle && (
                      <Dialog.Description className="m-(--space-0) mb-(--space-1) mt-(--space-1) text-sm opacity-60">{subtitle}</Dialog.Description>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-(--space-2)">
                  {actions}
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      title={downloadTooltip}
                      className="focus-ring min-h-11 min-w-11 rounded-lg p-(--space-2) opacity-70 transition-all hover:bg-surface-hover hover:opacity-100 active:scale-90"
                      aria-label="Download"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  )}
                  <Dialog.Close asChild>
                    <button
                      className="focus-ring min-h-11 min-w-11 rounded-lg bg-surface-hover/50 p-(--space-2) text-text transition-all hover:bg-surface-hover active:scale-90"
                      aria-label="Close"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </Dialog.Close>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-(--space-inset-default) sm:p-(--space-inset-panel) flex flex-col items-center justify-center">
                {children}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  };

  return (
    <>
      <div
        className={`flex flex-col rounded-theme border-theme bg-surface-hover/30 shadow-sm overflow-hidden my-(--space-2) max-w-full relative transition-all duration-300 ${className}`}
      >
        {/* Visual Header */}
        <div className="flex items-center justify-between px-(--space-inset-compact) py-(--space-inset-tight) border-b border-border/50 bg-surface-muted">
          <div className="flex items-center gap-(--space-2) overflow-hidden">
            {status === "loading" ? (
              <span className="w-4 h-4 rounded-full border-2 border-text/30 border-t-text animate-spin shrink-0" />
            ) : (
              icon && (
                <span className="shrink-0 flex items-center justify-center text-sm">
                  {icon}
                </span>
              )
            )}
            <div className="flex flex-col truncate min-w-0">
              <span className="text-xs font-semibold truncate uppercase tracking-wider opacity-80">
                {title}
              </span>
              {subtitle && (
                <span className="text-[10px] opacity-60 truncate">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end px-(--space-1) gap-(--space-1) shrink-0 ml-(--space-4)">
            {status === "loading" ? null : (
              <>
                {actions}
                {onDownload && (
                  <button
                    onClick={onDownload}
                    title={downloadTooltip}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover-surface text-foreground opacity-50 hover:opacity-100 transition-all active:scale-90 focus-ring"
                    aria-label="Download"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                )}
                {expandable && (
                  <button
                    onClick={toggleExpand}
                    title="Expand full screen"
                    className="focus-ring flex h-9 min-w-9 items-center justify-center rounded-md text-foreground opacity-50 transition-all hover:opacity-100 hover-surface active:scale-90 sm:h-8 sm:min-w-8"
                    aria-label="Expand full screen"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Inline Content */}
        {thumbnailMode && !isExpanded ? (
          <button
            type="button"
            onClick={toggleExpand}
            className="focus-ring relative w-full cursor-pointer group"
          >
            <div className="max-h-20 overflow-hidden pointer-events-none">
              {children}
            </div>
            <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/60 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity bg-surface-muted border-theme rounded-full px-(--space-3) py-(--space-1)">
                View diagram
              </span>
            </div>
          </button>
        ) : (
          <div className="w-full relative">{children}</div>
        )}
      </div>

      {/* Render Portal Modal if expanded */}
      {renderModal()}
    </>

  );
}

"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export interface ToolCardProps {
  title: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  status?: "idle" | "loading" | "success" | "error";
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
  onDownload,
  downloadTooltip = "Download",
  expandable = false,
  thumbnailMode = false,
  children,
  className = "",
}: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const renderModal = () => {
    if (!mounted || !isExpanded) return null;

    return (
      <Dialog.Root open={isExpanded} onOpenChange={setIsExpanded}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[99999] bg-[var(--background)]/80 backdrop-blur-md animate-in fade-in duration-200" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[100000] w-[calc(100vw-2rem)] max-w-7xl h-[90dvh] md:h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-surface text-[var(--foreground)] rounded-2xl shadow-2xl flex flex-col border border-border animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <Dialog.Title className="font-semibold text-lg m-0">{title}</Dialog.Title>
                  {subtitle && (
                    <Dialog.Description className="text-sm opacity-60 mt-0.5 m-0 mb-0.5">{subtitle}</Dialog.Description>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onDownload && (
                  <button
                    onClick={onDownload}
                    title={downloadTooltip}
                    className="p-2 rounded-lg hover:bg-surface-hover transition-all active:scale-90 opacity-70 hover:opacity-100"
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
                    className="p-2 rounded-lg hover:bg-surface-hover transition-all active:scale-90 bg-surface-hover/50 text-text"
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

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  };

  return (
    <>
      <div
        className={`flex flex-col rounded-xl border border-border bg-surface-hover/30 shadow-sm overflow-hidden my-2 max-w-full relative transition-all duration-300 ${className}`}
      >
        {/* Visual Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-surface-muted">
          <div className="flex items-center gap-2 overflow-hidden">
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
          <div className="flex items-center justify-end px-1 gap-1 shrink-0 ml-4">
            {status === "loading" ? null : (
              <>
                {onDownload && (
                  <button
                    onClick={onDownload}
                    title={downloadTooltip}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover-surface text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all active:scale-90"
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
className="w-7 h-7 flex items-center justify-center rounded-md hover-surface text-[var(--foreground)] opacity-50 hover:opacity-100 transition-all active:scale-90"
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
            className="w-full relative cursor-pointer group"
          >
            <div className="max-h-[80px] overflow-hidden pointer-events-none">
              {children}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/60 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70 group-hover:opacity-100 transition-opacity bg-[var(--surface-muted)] border-theme rounded-full px-3 py-1">
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

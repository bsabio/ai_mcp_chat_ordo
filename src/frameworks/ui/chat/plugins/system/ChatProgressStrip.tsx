"use client";

import React from "react";

import type { ActionLinkType } from "@/core/entities/rich-content";

import { ProgressStripBubble } from "./ProgressStripBubble";
import {
  resolveProgressStripLayout,
  type ResolvedProgressStripItem,
  type ProgressStripViewport,
} from "./resolve-progress-strip";

interface ChatProgressStripProps {
  items: readonly ResolvedProgressStripItem[];
  onActionClick?: (actionType: ActionLinkType, value: string, params?: Record<string, string>) => void;
}

const MOBILE_MEDIA_QUERY = "(max-width: 640px)";

function getViewport(): ProgressStripViewport {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "desktop";
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches ? "mobile" : "desktop";
}

function formatUpdatedAt(updatedAt: string | null): string | null {
  if (!updatedAt) {
    return null;
  }

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusHeading(item: ResolvedProgressStripItem): string {
  if (item.status === "failed") {
    return "Needs attention";
  }

  if (item.status === "canceled") {
    return "Canceled";
  }

  if (item.status === "queued") {
    return "Queued";
  }

  return "Running";
}

export function ChatProgressStrip({ items, onActionClick }: ChatProgressStripProps) {
  const [viewport, setViewport] = React.useState<ProgressStripViewport>(getViewport);
  const [openPanel, setOpenPanel] = React.useState<string | "overflow" | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRefs = React.useRef(new Map<string, HTMLButtonElement>());

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = () => setViewport(mediaQuery.matches ? "mobile" : "desktop");

    handleChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const layout = React.useMemo(
    () => resolveProgressStripLayout(items, viewport),
    [items, viewport],
  );

  const selectedItem = React.useMemo(
    () => layout.items.find((item) => item.jobId === openPanel) ?? null,
    [layout.items, openPanel],
  );

  React.useEffect(() => {
    if (!openPanel) {
      return;
    }

    if (openPanel === "overflow") {
      if (layout.overflowItems.length === 0) {
        setOpenPanel(null);
      }
      return;
    }

    if (!layout.items.some((item) => item.jobId === openPanel)) {
      setOpenPanel(null);
    }
  }, [layout.items, layout.overflowItems.length, openPanel]);

  React.useEffect(() => {
    if (!openPanel) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      const targetKey = openPanel;
      setOpenPanel(null);
      if (targetKey) {
        triggerRefs.current.get(targetKey)?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPanel]);

  if (layout.items.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="ui-chat-progress-strip flex flex-col gap-(--space-2)"
      data-chat-progress-strip="true"
    >
      <div className="ui-chat-progress-strip-rail flex flex-wrap items-center gap-(--space-2)">
        {layout.visibleItems.map((item) => {
          const isOpen = openPanel === item.jobId;

          return (
            <button
              key={item.jobId}
              ref={(node) => {
                if (node) {
                  triggerRefs.current.set(item.jobId, node);
                  return;
                }

                triggerRefs.current.delete(item.jobId);
              }}
              type="button"
              className="ui-chat-progress-strip-trigger focus-ring"
              aria-label={`${item.label}: ${item.statusText}`}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              onClick={() => setOpenPanel((current) => current === item.jobId ? null : item.jobId)}
            >
              <ProgressStripBubble
                label={item.label}
                status={item.bubbleStatus}
                value={item.statusText}
              />
            </button>
          );
        })}

        {layout.overflowItems.length > 0 ? (
          <button
            ref={(node) => {
              if (node) {
                triggerRefs.current.set("overflow", node);
                return;
              }

              triggerRefs.current.delete("overflow");
            }}
            type="button"
            className="ui-chat-progress-strip-overflow focus-ring"
            aria-label={`More active work (${layout.overflowItems.length})`}
            aria-expanded={openPanel === "overflow"}
            aria-haspopup="dialog"
            onClick={() => setOpenPanel((current) => current === "overflow" ? null : "overflow")}
          >
            +{layout.overflowItems.length} more
          </button>
        ) : null}
      </div>

      {openPanel === "overflow" ? (
        <div
          className="ui-chat-progress-strip-panel"
          role="dialog"
          aria-label="More active work"
          data-chat-progress-strip-panel="overflow"
        >
          <p className="ui-chat-progress-strip-panel-eyebrow">More active work</p>
          <div className="flex flex-col gap-(--space-2)">
            {layout.overflowItems.map((item) => (
              <button
                key={item.jobId}
                type="button"
                className="ui-chat-progress-strip-list-item focus-ring"
                aria-label={`${item.label} ${item.statusText}`}
                onClick={() => setOpenPanel(item.jobId)}
              >
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="text-sm text-foreground/60">{item.statusText}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div
          className="ui-chat-progress-strip-panel"
          role="dialog"
          aria-label={`${selectedItem.label} progress details`}
          data-chat-progress-strip-panel={selectedItem.jobId}
        >
          <div className="flex flex-col gap-(--space-1)">
            <p className="ui-chat-progress-strip-panel-eyebrow">{selectedItem.label}</p>
            <h3 className="text-sm font-semibold text-foreground">
              {selectedItem.title ?? selectedItem.label}
            </h3>
            {selectedItem.subtitle ? (
              <p className="text-sm text-foreground/60">{selectedItem.subtitle}</p>
            ) : null}
          </div>

          <dl className="ui-chat-progress-strip-meta">
            <div>
              <dt>Status</dt>
              <dd>{getStatusHeading(selectedItem)}</dd>
            </div>
            <div>
              <dt>Progress</dt>
              <dd>{selectedItem.statusText}</dd>
            </div>
            {formatUpdatedAt(selectedItem.updatedAt) ? (
              <div>
                <dt>Updated</dt>
                <dd>{formatUpdatedAt(selectedItem.updatedAt)}</dd>
              </div>
            ) : null}
          </dl>

          {selectedItem.summary ? (
            <p className="text-sm leading-relaxed text-foreground/72">{selectedItem.summary}</p>
          ) : null}

          {selectedItem.canRetryWholeJob ? (
            <div className="flex justify-end">
              <button
                type="button"
                className="ui-chat-action-chip focus-ring inline-flex items-center gap-(--space-2) rounded-full px-(--space-inset-compact) py-(--space-1) text-[0.78rem] font-semibold transition-colors"
                onClick={() => onActionClick?.("job", selectedItem.jobId, { operation: "retry" })}
              >
                Retry whole job
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
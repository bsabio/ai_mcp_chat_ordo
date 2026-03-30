"use client";

/**
 * Bulk action bar for admin Browse pages.
 * Appears when rows are selected in AdminDataTable.
 * Sticky bottom bar on mobile, floating above table on desktop.
 * Confirmation dialog on destructive actions.
 */

import { useState } from "react";

export interface BulkAction {
  label: string;
  action: string;
  variant?: "default" | "destructive";
}

interface AdminBulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function AdminBulkActionBar({ count, actions, onClear }: AdminBulkActionBarProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  if (count === 0) return null;

  return (
    <div
      className="sticky bottom-0 z-10 flex items-center gap-(--space-3) rounded-xl border border-foreground/12 bg-surface/95 px-(--space-4) py-(--space-3) shadow-lg backdrop-blur-sm sm:relative sm:mt-(--space-4)"
      data-admin-bulk-action-bar="true"
    >
      <span className="text-sm font-medium text-foreground tabular-nums">
        {count} selected
      </span>

      <div className="ml-auto flex items-center gap-(--space-2)">
        {actions.map((act) => {
          const isDestructive = act.variant === "destructive";
          const isConfirming = confirmAction === act.action;

          if (isConfirming) {
            return (
              <span key={act.action} className="flex items-center gap-(--space-1)">
                <span className="text-xs text-foreground/60">
                  {act.label} {count} item{count !== 1 ? "s" : ""}?
                </span>
                <button
                  type="submit"
                  name="bulkAction"
                  value={act.action}
                  className="btn-secondary haptic-press rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition active:scale-95"
                  onClick={() => setConfirmAction(null)}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs text-foreground/60 transition hover:bg-foreground/5"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>
              </span>
            );
          }

          return (
            <button
              key={act.action}
              type={isDestructive ? "button" : "submit"}
              name={isDestructive ? undefined : "bulkAction"}
              value={isDestructive ? undefined : act.action}
              className={`btn-secondary haptic-press rounded-lg border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                isDestructive
                  ? "border-red-300/20 text-red-400 hover:bg-red-500/10"
                  : "border-foreground/12 text-foreground hover:bg-foreground/5"
              }`}
              onClick={isDestructive ? () => setConfirmAction(act.action) : undefined}
            >
              {act.label}
            </button>
          );
        })}

        <button
          type="button"
          className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs text-foreground/50 transition hover:bg-foreground/5"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

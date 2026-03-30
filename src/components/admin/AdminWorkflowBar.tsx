"use client";

/**
 * Workflow transition bar for admin detail pages.
 * Renders buttons for each allowed transition with confirmation dialog.
 */

import { useState } from "react";
import type { WorkflowActionDescriptor } from "@/lib/admin/shared/admin-workflow";

interface AdminWorkflowBarProps {
  actions: WorkflowActionDescriptor[];
  currentStatus: string;
}

export function AdminWorkflowBar({ actions, currentStatus }: AdminWorkflowBarProps) {
  const [confirming, setConfirming] = useState<string | null>(null);

  if (actions.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-(--space-2) rounded-xl border border-foreground/8 bg-surface px-(--space-4) py-(--space-3)"
      data-admin-workflow-bar="true"
    >
      <span className="mr-auto text-xs font-(--font-label) tracking-wide text-foreground/50">
        Status: <strong className="text-foreground">{currentStatus}</strong>
      </span>
      {actions.map((action) => {
        const isConfirming = confirming === action.nextStatus;
        return isConfirming ? (
          <span key={action.nextStatus} className="flex items-center gap-(--space-1)">
            <span className="text-xs text-foreground/60">{action.description}</span>
            <button
              type="submit"
              name="nextStatus"
              value={action.nextStatus}
              className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition active:scale-95"
              onClick={() => setConfirming(null)}
            >
              Confirm
            </button>
            <button
              type="button"
              className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs text-foreground/60 transition hover:bg-foreground/5"
              onClick={() => setConfirming(null)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            key={action.nextStatus}
            type="button"
            title={action.description}
            className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/5 active:scale-95"
            onClick={() => setConfirming(action.nextStatus)}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

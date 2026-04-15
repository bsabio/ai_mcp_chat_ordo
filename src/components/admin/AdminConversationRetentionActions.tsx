"use client";

import { useState, useTransition } from "react";

import {
  exportConversationAction,
  exportConversationTranscriptAction,
  purgeConversationAction,
} from "@/lib/admin/conversations/admin-conversations-actions";

interface AdminConversationRetentionActionsProps {
  conversationId: string;
  purgeEligible: boolean;
  purgeBlockedReason: string | null;
}

export function AdminConversationRetentionActions({
  conversationId,
  purgeEligible,
  purgeBlockedReason,
}: AdminConversationRetentionActionsProps) {
  const [isExportPending, startExportTransition] = useTransition();
  const [pendingExportKind, setPendingExportKind] = useState<"json" | "transcript" | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  function downloadPayload(result: { fileName: string; mimeType: string; payload: string }) {
    const blob = new Blob([result.payload], { type: result.mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  function runExport(
    kind: "json" | "transcript",
    action: (formData: FormData) => Promise<{ fileName: string; mimeType: string; payload: string }>,
  ) {
    startExportTransition(async () => {
      setPendingExportKind(kind);
      try {
        const formData = new FormData();
        formData.set("id", conversationId);
        downloadPayload(await action(formData));
      } finally {
        setPendingExportKind(null);
      }
    });
  }

  return (
    <div className="grid gap-(--space-3)">
      <div className="flex flex-wrap items-center gap-(--space-2)">
        <button
          type="button"
          onClick={() => runExport("json", exportConversationAction)}
          className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isExportPending}
        >
          {pendingExportKind === "json" ? "Preparing JSON…" : "Export JSON"}
        </button>

        <button
          type="button"
          onClick={() => runExport("transcript", exportConversationTranscriptAction)}
          className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isExportPending}
        >
          {pendingExportKind === "transcript" ? "Preparing transcript…" : "Export transcript JSON"}
        </button>

        {purgeEligible ? (
          confirmingPurge ? (
            <form action={purgeConversationAction} className="flex flex-wrap items-center gap-(--space-2)">
              <input type="hidden" name="id" value={conversationId} />
              <input type="hidden" name="reason" value="admin_removed" />
              <span className="text-xs text-foreground/60">Purge permanently removes the conversation and preserves only audit metadata.</span>
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Confirm purge
              </button>
              <button
                type="button"
                className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs text-foreground/60 transition hover:bg-foreground/5"
                onClick={() => setConfirmingPurge(false)}
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/8"
              onClick={() => setConfirmingPurge(true)}
            >
              Purge permanently
            </button>
          )
        ) : (
          <button
            type="button"
            className="rounded-lg border border-foreground/12 px-3 py-1.5 text-xs font-medium text-foreground/45"
            disabled
            title={purgeBlockedReason ?? "Purge is currently blocked."}
          >
            Purge blocked
          </button>
        )}
      </div>

      {purgeBlockedReason ? (
        <p className="text-xs leading-relaxed text-foreground/55">{purgeBlockedReason}</p>
      ) : null}
    </div>
  );
}
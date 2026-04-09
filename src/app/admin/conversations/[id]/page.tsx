import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminDetailShell } from "@/components/admin/AdminDetailShell";
import { AdminConversationRetentionActions } from "@/components/admin/AdminConversationRetentionActions";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminConversationDetail } from "@/lib/admin/conversations/admin-conversations";
import {
  restoreConversationAction,
  takeOverConversationAction,
  handBackConversationAction,
} from "@/lib/admin/conversations/admin-conversations-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conversation Detail",
  robots: { index: false, follow: false },
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LaneBadge({ lane, confidence }: { lane: string; confidence: number | null }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
        {lane}
      </span>
      {confidence != null && (
        <span className="text-xs text-foreground/40">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}

// ── Message bubbles ────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: { id: string; role: string; content: string; parts: unknown[]; tokenEstimate: number; createdAt: string } }) {
  const isUser = msg.role === "user";
  const isSystem = msg.role === "system";

  // Check for tool invocations in parts
  const toolParts = (msg.parts as Array<{ type?: string; toolName?: string }>).filter(
    (p) => p.type === "tool-invocation" || p.type === "tool-result",
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isSystem
            ? "border border-foreground/8 bg-foreground/2 text-foreground/50 italic"
            : isUser
              ? "bg-foreground/8 text-foreground"
              : "border border-foreground/8 bg-surface text-foreground"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-foreground/40">
            {msg.role}
          </span>
          <span className="text-[0.55rem] text-foreground/30 tabular-nums">
            {msg.tokenEstimate > 0 && `${msg.tokenEstimate} tok · `}
            {formatDate(msg.createdAt)}
          </span>
        </div>
        <div className="mt-1 text-sm whitespace-pre-wrap wrap-break-word">
          {msg.content}
        </div>
        {toolParts.length > 0 && (
          <details className="mt-2 rounded border border-foreground/8 p-2 text-xs">
            <summary className="cursor-pointer font-medium text-foreground/60">
              {toolParts.length} tool invocation{toolParts.length !== 1 ? "s" : ""}
            </summary>
            <pre className="mt-1 overflow-auto text-foreground/50 whitespace-pre-wrap">
              {JSON.stringify(toolParts, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageAccess();
  const { id } = await params;
  const detail = await loadAdminConversationDetail(id);
  const { conversation: conv, messages, totalTokens } = detail;

  const isHumanMode = conv.conversationMode === "human";
  const isDeleted = conv.deletedAt != null;

  return (
    <AdminSection
      title={conv.title}
      description={`${conv.userName} · ${conv.messageCount} messages · ${totalTokens.toLocaleString()} tokens`}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Conversations", href: "/admin/conversations" },
        { label: conv.id },
      ]}
    >
      <div className="px-(--space-inset-panel)">
        {/* Human mode banner */}
        {isHumanMode && (
          <div className="mb-(--space-4) rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">
            You are actively managing this conversation.
          </div>
        )}

        {isDeleted && (
          <div className="mb-(--space-4) rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">This conversation is currently deleted from self-service history.</p>
                <p className="mt-1 text-xs text-amber-800/80">
                  Deleted {formatDate(conv.deletedAt)}{conv.purgeAfter ? ` · purge eligible ${formatDate(conv.purgeAfter)}` : ""}
                </p>
              </div>
              <form action={restoreConversationAction}>
                <input type="hidden" name="id" value={conv.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700"
                >
                  Restore
                </button>
              </form>
            </div>
          </div>
        )}

        <AdminDetailShell
          backHref="/admin/conversations"
          backLabel="All Conversations"
          main={
            <div className="grid gap-(--space-section-default)">
              {/* Takeover / hand-back control */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                {isHumanMode ? (
                  <form action={handBackConversationAction} className="flex items-center justify-between">
                    <input type="hidden" name="id" value={conv.id} />
                    <span className="text-sm text-foreground/60">Conversation is in human mode.</span>
                    <button
                      type="submit"
                      className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
                    >
                      Return to AI
                    </button>
                  </form>
                ) : (
                  <form action={takeOverConversationAction} className="flex items-center justify-between gap-3">
                    <input type="hidden" name="id" value={conv.id} />
                    <div>
                      <span className="text-sm text-foreground/60">Conversation is in AI mode.</span>
                      <p className="mt-0.5 text-xs text-foreground/40">Taking over will interrupt the active AI session. Please confirm before proceeding.</p>
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
                    >
                      Take Over
                    </button>
                  </form>
                )}
              </section>

              {/* Message thread */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Messages</h2>
                <div className="mt-(--space-3) grid gap-(--space-3)">
                  {messages.length === 0 ? (
                    <p className="text-xs text-foreground/40">No messages yet.</p>
                  ) : (
                    messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Retention</h2>
                <div className="mt-(--space-3)">
                  <AdminConversationRetentionActions
                    conversationId={conv.id}
                    purgeEligible={conv.purgeEligible}
                    purgeBlockedReason={conv.purgeBlockedReason}
                  />
                </div>
              </section>
            </div>
          }
          sidebar={
            <div className="grid gap-(--space-section-default)">
              {/* Routing intelligence */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Routing Intelligence</h2>
                <dl className="mt-(--space-2) grid gap-(--space-2) text-xs">
                  <div>
                    <dt className="text-foreground/50">Lane</dt>
                    <dd className="mt-0.5"><LaneBadge lane={conv.lane} confidence={conv.laneConfidence} /></dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Detected need</dt>
                    <dd className="mt-0.5 text-foreground">{conv.detectedNeedSummary || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Recommended next step</dt>
                    <dd className="mt-0.5 text-foreground">{conv.recommendedNextStep || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Prompt version</dt>
                    <dd className="mt-0.5 text-foreground">{conv.promptVersion ?? "—"}</dd>
                  </div>
                </dl>
              </section>

              {/* Session info */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Session</h2>
                <dl className="mt-(--space-2) grid gap-(--space-1) text-xs">
                  <div className="flex justify-between text-foreground/60">
                    <dt>Source</dt>
                    <dd>{conv.sessionSource}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Referral ID</dt>
                    <dd>{conv.referralId || "—"}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Referral</dt>
                    <dd>{conv.referralSource || "—"}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Trusted referrer</dt>
                    <dd>{conv.trustedReferrerName || "—"}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Credential</dt>
                    <dd>{conv.trustedReferrerCredential || "—"}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Converted from</dt>
                    <dd>{conv.convertedFrom || "—"}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Status</dt>
                    <dd>{conv.status}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Deleted at</dt>
                    <dd>{formatDate(conv.deletedAt)}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Deleted by</dt>
                    <dd>{conv.deletedByUserId || "—"}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Delete reason</dt>
                    <dd>{conv.deleteReason || "—"}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Purge after</dt>
                    <dd>{formatDate(conv.purgeAfter)}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Imported at</dt>
                    <dd>{formatDate(conv.importedAt)}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Imported from</dt>
                    <dd>{conv.importSourceConversationId || "—"}</dd>
                  </div>
                </dl>
              </section>

              {/* Stats */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Stats</h2>
                <dl className="mt-(--space-2) grid gap-(--space-1) text-xs">
                  <div className="flex justify-between text-foreground/60">
                    <dt>Messages</dt>
                    <dd>{conv.messageCount}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Total tokens</dt>
                    <dd>{totalTokens.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Created</dt>
                    <dd>{formatDate(conv.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between text-foreground/60">
                    <dt>Updated</dt>
                    <dd>{formatDate(conv.updatedAt)}</dd>
                  </div>
                </dl>
              </section>
            </div>
          }
        />
      </div>
    </AdminSection>
  );
}

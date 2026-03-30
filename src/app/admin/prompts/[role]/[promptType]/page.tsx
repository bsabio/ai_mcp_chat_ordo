import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminDetailShell } from "@/components/admin/AdminDetailShell";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminPromptDetail } from "@/lib/admin/prompts/admin-prompts";
import {
  createPromptVersionAction,
  activatePromptVersionAction,
} from "@/lib/admin/prompts/admin-prompts-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prompt Detail",
  robots: { index: false, follow: false },
};

// ── Role badge colours ─────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ALL: "bg-blue-500/15 text-blue-600",
  ANONYMOUS: "bg-gray-500/15 text-gray-600",
  AUTHENTICATED: "bg-green-500/15 text-green-600",
  STAFF: "bg-amber-500/15 text-amber-600",
  ADMIN: "bg-red-500/15 text-red-600",
};

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? "bg-foreground/8 text-foreground/60";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${colors}`}>
      {role}
    </span>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function AdminPromptDetailPage({
  params,
}: {
  params: Promise<{ role: string; promptType: string }>;
}) {
  await requireAdminPageAccess();
  const { role, promptType } = await params;
  const detail = await loadAdminPromptDetail(
    decodeURIComponent(role),
    decodeURIComponent(promptType),
  );

  const { slot, versions, activeContent } = detail;
  const typeLabel = slot.promptType === "base" ? "Base Prompt" : "Role Directive";

  return (
    <AdminSection
      title={`${typeLabel}: ${slot.role}`}
      description={`${slot.totalVersions} version${slot.totalVersions !== 1 ? "s" : ""} — ${slot.activeVersion != null ? `v${slot.activeVersion} active` : "no active version"}`}
    >
      <div className="px-(--space-inset-panel)">
        <AdminDetailShell
          main={
            <div className="grid gap-(--space-section-default)">
              {/* Active content display */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground/60">Active Content</h2>
                  <div className="flex items-center gap-(--space-2)">
                    <RoleBadge role={slot.role} />
                    {slot.activeVersion != null && (
                      <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-green-600">
                        v{slot.activeVersion}
                      </span>
                    )}
                  </div>
                </div>
                {activeContent ? (
                  <pre className="mt-(--space-3) max-h-[60vh] overflow-auto rounded-lg border border-foreground/8 bg-foreground/[0.02] p-(--space-3) text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words font-mono">
                    {activeContent}
                  </pre>
                ) : (
                  <p className="mt-(--space-3) text-sm text-foreground/40 italic">
                    No active version. Create and activate a version below.
                  </p>
                )}
              </section>

              {/* Create new version form */}
              <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
                <h2 className="text-sm font-semibold text-foreground/60">Create New Version</h2>
                <form action={createPromptVersionAction} className="mt-(--space-3) grid gap-(--space-3)">
                  <input type="hidden" name="role" value={slot.role} />
                  <input type="hidden" name="promptType" value={slot.promptType} />
                  <label className="grid gap-(--space-1)">
                    <span className="text-xs text-foreground/50">Content</span>
                    <textarea
                      name="content"
                      defaultValue={activeContent}
                      rows={12}
                      className="w-full rounded-lg border border-foreground/12 bg-surface px-3 py-2 text-sm text-foreground font-mono outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                      placeholder="Enter prompt content…"
                      required
                    />
                  </label>
                  <label className="grid gap-(--space-1)">
                    <span className="text-xs text-foreground/50">Change notes (optional)</span>
                    <input
                      type="text"
                      name="notes"
                      className="h-9 rounded-lg border border-foreground/12 bg-surface px-3 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                      placeholder="What changed?"
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-foreground/8 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/14 active:scale-95"
                    >
                      Create version (does not auto-activate)
                    </button>
                  </div>
                </form>
              </section>
            </div>
          }
          sidebar={
            <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
              <h2 className="text-sm font-semibold text-foreground/60">Version History</h2>
              <div className="mt-(--space-3) grid gap-(--space-2)">
                {versions.length === 0 ? (
                  <p className="text-xs text-foreground/40">No versions yet.</p>
                ) : (
                  versions.map((v) => (
                    <div
                      key={v.version}
                      className={`rounded-lg border p-(--space-2) text-xs ${
                        v.isActive
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-foreground/8"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          v{v.version}
                          {v.isActive && (
                            <span className="ml-1 rounded bg-green-500/15 px-1 text-[0.6rem] font-bold text-green-600">
                              ACTIVE
                            </span>
                          )}
                        </span>
                        <span className="text-foreground/40">{formatDate(v.createdAt)}</span>
                      </div>
                      {v.notes && (
                        <p className="mt-1 text-foreground/60">{v.notes}</p>
                      )}
                      {v.createdBy && (
                        <p className="mt-0.5 text-foreground/40">by {v.createdBy}</p>
                      )}
                      {!v.isActive && (
                        <form action={activatePromptVersionAction} className="mt-(--space-1)">
                          <input type="hidden" name="role" value={slot.role} />
                          <input type="hidden" name="promptType" value={slot.promptType} />
                          <input type="hidden" name="version" value={v.version} />
                          <button
                            type="submit"
                            className="rounded-lg border border-foreground/12 px-2 py-1 text-[0.65rem] font-medium text-foreground/60 transition hover:bg-foreground/5"
                          >
                            Activate
                          </button>
                        </form>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          }
        />
      </div>
    </AdminSection>
  );
}

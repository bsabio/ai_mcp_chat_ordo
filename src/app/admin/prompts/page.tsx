import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadAdminPromptSlots } from "@/lib/admin/prompts/admin-prompts";
import { getAdminPromptDetailPath } from "@/lib/admin/prompts/admin-prompts-routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin System Prompts",
  robots: { index: false, follow: false },
};

// ── Role badge colours ─────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ALL: "bg-blue-500/15 text-blue-600",
  ANONYMOUS: "bg-gray-500/15 text-gray-600",
  AUTHENTICATED: "bg-green-500/15 text-green-600",
  APPRENTICE: "bg-violet-500/15 text-violet-600",
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

function formatSlotUpdatedLabel(lastUpdated: string, runtimeCoverage: "db" | "fallback" | "missing"): string {
  if (!lastUpdated) {
    return runtimeCoverage === "fallback" ? "Runtime fallback" : "No stored versions";
  }

  return new Date(lastUpdated).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Page ───────────────────────────────────────────────────────────────

export default async function AdminPromptsPage() {
  await requireAdminPageAccess();
  const slots = await loadAdminPromptSlots();

  return (
    <AdminSection
      title="System Prompts"
      description="Versioned prompt management with activation control."
    >
      <div className="admin-route-stack">
        {slots.length === 0 ? (
          <AdminEmptyState
            heading="No prompt versions"
            description="No system prompt versions have been created yet."
          />
        ) : (
          <div className="grid gap-(--space-3) sm:grid-cols-2 lg:grid-cols-3" data-admin-prompts-grid="true">
            {slots.map((slot) => (
              <a
                key={`${slot.role}:${slot.promptType}`}
                href={getAdminPromptDetailPath(slot.role, slot.promptType)}
                className="admin-panel-surface group rounded-xl p-(--space-inset-default) transition hover:border-foreground/16 hover:shadow-sm sm:p-(--space-inset-panel)"
                data-admin-prompt-card="true"
              >
                <div className="flex items-center justify-between">
                  <RoleBadge role={slot.role} />
                  <span className="text-xs text-foreground/40">{slot.totalVersions} version{slot.totalVersions !== 1 ? "s" : ""}</span>
                </div>
                <h2 className="mt-(--space-2) text-sm font-semibold text-foreground">
                  {slot.promptType === "base" ? "Base Prompt" : "Role Directive"}
                </h2>
                <div className="mt-(--space-1) flex items-center gap-(--space-2) text-xs text-foreground/50">
                  {slot.activeVersion != null ? (
                    <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-green-600">
                      v{slot.activeVersion}
                    </span>
                  ) : slot.runtimeCoverage === "fallback" ? (
                    <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-sky-600">
                      FALLBACK ACTIVE
                    </span>
                  ) : (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-600">
                      NO ACTIVE
                    </span>
                  )}
                  <span>Updated {formatSlotUpdatedLabel(slot.lastUpdated, slot.runtimeCoverage)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </AdminSection>
  );
}

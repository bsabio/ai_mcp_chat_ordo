import type { Metadata } from "next";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSection } from "@/components/admin/AdminSection";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { loadSystemHealthBlock } from "@/lib/operator/loaders/admin-loaders";
import { getToolComposition } from "@/lib/chat/tool-composition-root";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin System",
  robots: { index: false, follow: false },
};

function redactValue(key: string, value: string | undefined): string {
  if (!value) return "—";
  const sensitiveKeys = ["API_KEY", "JWT_SECRET", "SECRET", "PASSWORD", "TOKEN"];
  if (sensitiveKeys.some((s) => key.toUpperCase().includes(s))) {
    return value.length > 4 ? `${value.slice(0, 4)}${"•".repeat(Math.min(20, value.length - 4))}` : "••••";
  }
  return value;
}

export default async function AdminSystemPage() {
  const user = await requireAdminPageAccess();
  const systemHealth = await loadSystemHealthBlock(user);
  const healthSummary = systemHealth.data.summary;
  const warnings = systemHealth.data.warnings;

  const envVars: Array<{ key: string; value: string }> = [
    { key: "ANTHROPIC_MODEL", value: redactValue("ANTHROPIC_MODEL", process.env.ANTHROPIC_MODEL) },
    { key: "STUDIO_ORDO_DB_PATH", value: redactValue("STUDIO_ORDO_DB_PATH", process.env.STUDIO_ORDO_DB_PATH) },
    { key: "VAPID_PUBLIC_KEY", value: redactValue("VAPID_PUBLIC_KEY", process.env.VAPID_PUBLIC_KEY) },
    { key: "ANTHROPIC_API_KEY", value: redactValue("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY) },
    { key: "JWT_SECRET", value: redactValue("JWT_SECRET", process.env.JWT_SECRET) },
  ];

  const modelName = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const workerId = process.env.DEFERRED_JOB_WORKER_ID ?? "—";

  const { registry } = getToolComposition();
  const toolNames = registry.getToolNames();
  const toolsByCategory: Record<string, string[]> = {};
  for (const name of toolNames) {
    const descriptor = registry.getDescriptor(name);
    const category = descriptor?.category ?? "uncategorized";
    if (!toolsByCategory[category]) toolsByCategory[category] = [];
    toolsByCategory[category].push(name);
  }

  return (
    <AdminSection
      title="System"
      description="Health status, runtime configuration, model policy, registered tools, and active workers."
    >
      <div className="grid gap-(--space-section-default) px-(--space-inset-panel)">
        {/* Section 1 — Health Status */}
        <AdminCard
          title="Health status"
          description={warnings.length === 0 ? "All systems operational." : warnings[0]}
          status={healthSummary.overallStatus === "ok" ? "ok" : "warning"}
        >
          <dl className="grid gap-(--space-2) text-sm text-foreground/62">
            <div className="flex items-center justify-between gap-(--space-cluster-default)">
              <dt>Readiness</dt>
              <dd>{healthSummary.readinessStatus}</dd>
            </div>
            <div className="flex items-center justify-between gap-(--space-cluster-default)">
              <dt>Liveness</dt>
              <dd>{healthSummary.livenessStatus}</dd>
            </div>
            <div className="flex items-center justify-between gap-(--space-cluster-default)">
              <dt>Environment</dt>
              <dd>{healthSummary.environmentStatus}</dd>
            </div>
          </dl>
          {warnings.length > 1 && (
            <ul className="mt-(--space-3) grid gap-(--space-1) text-xs text-foreground/50">
              {warnings.slice(1).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* Section 2 — Runtime Configuration */}
        <AdminCard title="Runtime configuration" description="Key environment variables (sensitive values redacted).">
          <dl className="grid gap-(--space-2) text-sm">
            {envVars.map((v) => (
              <div key={v.key} className="flex items-center justify-between gap-(--space-cluster-default)">
                <dt className="text-foreground/50 font-mono text-xs">{v.key}</dt>
                <dd className="truncate text-foreground/70 text-xs font-mono max-w-[16rem]">{v.value}</dd>
              </div>
            ))}
          </dl>
        </AdminCard>

        {/* Section 3 — Model Policy */}
        <AdminCard title="Model policy" description="Current model configuration and limits.">
          <dl className="grid gap-(--space-2) text-sm text-foreground/62">
            <div className="flex items-center justify-between gap-(--space-cluster-default)">
              <dt>Model</dt>
              <dd className="font-mono text-xs">{modelName}</dd>
            </div>
            <div className="flex items-center justify-between gap-(--space-cluster-default)">
              <dt>Provider</dt>
              <dd>Anthropic</dd>
            </div>
          </dl>
        </AdminCard>

        {/* Section 4 — Registered Tools */}
        <AdminCard title="Registered tools" description={`${toolNames.length} tools across ${Object.keys(toolsByCategory).length} categories.`}>
          <div className="grid gap-(--space-3)">
            {Object.entries(toolsByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, names]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{category} ({names.length})</h3>
                <ul className="mt-(--space-1) grid gap-(--space-1) text-xs text-foreground/60">
                  {names.sort().map((n) => (
                    <li key={n} className="font-mono">{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Section 5 — Active Workers */}
        <AdminCard title="Active workers" description="Deferred job worker status.">
          <dl className="grid gap-(--space-2) text-sm text-foreground/62">
            <div className="flex items-center justify-between gap-(--space-cluster-default)">
              <dt>Worker ID</dt>
              <dd className="font-mono text-xs">{workerId}</dd>
            </div>
          </dl>
        </AdminCard>
      </div>
    </AdminSection>
  );
}
import type { Metadata } from "next";

import { AdminCard } from "@/components/admin/AdminCard";
import { AdminSection } from "@/components/admin/AdminSection";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import { getDiagnosticsReport } from "@/lib/admin/processes";
import { loadSystemHealthBlock } from "@/lib/operator/loaders/admin-loaders";
import { getToolComposition } from "@/lib/chat/tool-composition-root";
import { getRuntimeToolCountsByRole } from "@/lib/chat/runtime-manifest";

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
  const diagnostics = getDiagnosticsReport();
  const healthSummary = systemHealth.data.summary;
  const warnings = systemHealth.data.warnings;
  const referralDiagnostics = systemHealth.data.referral;
  const openAiDiagnostics = diagnostics.integrations.openai;

  const envVars: Array<{ key: string; value: string }> = [
    { key: "ANTHROPIC_MODEL", value: redactValue("ANTHROPIC_MODEL", process.env.ANTHROPIC_MODEL) },
    { key: "STUDIO_ORDO_DB_PATH", value: redactValue("STUDIO_ORDO_DB_PATH", process.env.STUDIO_ORDO_DB_PATH) },
    { key: "VAPID_PUBLIC_KEY", value: redactValue("VAPID_PUBLIC_KEY", process.env.VAPID_PUBLIC_KEY) },
    { key: "ANTHROPIC_API_KEY", value: redactValue("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY) },
    { key: "OPENAI_API_KEY", value: redactValue("OPENAI_API_KEY", process.env.OPENAI_API_KEY) },
    { key: "JWT_SECRET", value: redactValue("JWT_SECRET", process.env.JWT_SECRET) },
  ];

  const modelName = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const workerId = process.env.DEFERRED_JOB_WORKER_ID ?? "—";

  const { registry } = getToolComposition();
  const toolNames = registry.getToolNames();
  const roleToolCounts = getRuntimeToolCountsByRole(registry);
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
      <div className="admin-route-stack">
        {/* Section 1 — Health Status */}
        <AdminCard
          title="Health status"
          description={warnings.length === 0 ? "All systems operational." : warnings[0]}
          status={healthSummary.overallStatus === "ok" ? "ok" : "warning"}
        >
          <dl className="admin-system-list text-sm text-foreground/62">
            <div className="admin-system-row">
              <dt>Readiness</dt>
              <dd>{healthSummary.readinessStatus}</dd>
            </div>
            <div className="admin-system-row">
              <dt>Liveness</dt>
              <dd>{healthSummary.livenessStatus}</dd>
            </div>
            <div className="admin-system-row">
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
          <dl className="admin-system-list text-sm">
            {envVars.map((v) => (
              <div key={v.key} className="admin-system-row">
                <dt className="admin-mono-label text-foreground/50 text-xs">{v.key}</dt>
                <dd className="admin-mono-value text-foreground/70 text-xs">{v.value}</dd>
              </div>
            ))}
          </dl>
        </AdminCard>

        {/* Section 3 — Model Policy */}
        <AdminCard title="Model policy" description="Current model configuration and limits.">
          <dl className="admin-system-list text-sm text-foreground/62">
            <div className="admin-system-row">
              <dt>Model</dt>
              <dd className="admin-mono-value text-xs">{modelName}</dd>
            </div>
            <div className="admin-system-row">
              <dt>Provider</dt>
              <dd>Anthropic</dd>
            </div>
          </dl>
        </AdminCard>

        <AdminCard
          title="Feature integrations"
          description="Visibility into optional runtime features that can fail independently of core chat readiness."
          status={openAiDiagnostics.status === "ok" ? "ok" : "warning"}
        >
          <dl className="admin-system-list text-sm text-foreground/62">
            <div className="admin-system-row">
              <dt>OpenAI-backed audio</dt>
              <dd>{openAiDiagnostics.configured ? "configured" : "missing config"}</dd>
            </div>
          </dl>
          <p className="mt-(--space-3) text-xs text-foreground/50">{openAiDiagnostics.summary}</p>
        </AdminCard>

        <AdminCard
          title="Referral diagnostics"
          description="Public origin configuration and anonymous 'who referred me?' verification live in the same release-readiness surface."
          status={referralDiagnostics.warnings.length === 0 ? "ok" : "warning"}
        >
          <dl className="admin-system-list text-sm text-foreground/62">
            <div className="admin-system-row">
              <dt>Public origin</dt>
              <dd className="admin-mono-value text-xs">{referralDiagnostics.publicOrigin}</dd>
            </div>
            <div className="admin-system-row">
              <dt>Origin source</dt>
              <dd>{referralDiagnostics.originSource}</dd>
            </div>
            <div className="admin-system-row">
              <dt>Localhost fallback</dt>
              <dd>{referralDiagnostics.localhostFallback ? "active" : "inactive"}</dd>
            </div>
            <div className="admin-system-row">
              <dt>Known-referrer prompt check</dt>
              <dd>{referralDiagnostics.knownReferrerPromptVerified ? "verified" : "failed"}</dd>
            </div>
            <div className="admin-system-row">
              <dt>No-referrer prompt check</dt>
              <dd>{referralDiagnostics.missingReferrerPromptVerified ? "verified" : "failed"}</dd>
            </div>
          </dl>
          {referralDiagnostics.warnings.length > 0 ? (
            <ul className="mt-(--space-3) grid gap-(--space-1) text-xs text-foreground/50">
              {referralDiagnostics.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </AdminCard>

        {/* Section 4 — Registered Tools */}
        <AdminCard title="Registered tools" description={`${toolNames.length} tools across ${Object.keys(toolsByCategory).length} categories.`}>
          <dl className="admin-system-list mb-(--space-3) text-sm text-foreground/62">
            {Object.entries(roleToolCounts).map(([roleName, count]) => (
              <div key={roleName} className="admin-system-row">
                <dt>{roleName}</dt>
                <dd>{count} tools</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-(--space-3)">
            {Object.entries(toolsByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, names]) => (
              <div key={category} className="admin-tool-category">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{category} ({names.length})</h3>
                <ul className="admin-tool-list text-xs text-foreground/60">
                  {names.sort().map((n) => (
                    <li key={n} className="admin-tool-token">{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Section 5 — Active Workers */}
        <AdminCard title="Active workers" description="Deferred job worker status.">
          <dl className="admin-system-list text-sm text-foreground/62">
            <div className="admin-system-row">
              <dt>Worker ID</dt>
              <dd className="admin-mono-value text-xs">{workerId}</dd>
            </div>
          </dl>
        </AdminCard>
      </div>
    </AdminSection>
  );
}
import type { Metadata } from "next";

import { AdminSection } from "@/components/admin/AdminSection";
import { AdminDetailShell } from "@/components/admin/AdminDetailShell";
import { AdminWorkflowBar } from "@/components/admin/AdminWorkflowBar";
import { requireAdminPageAccess } from "@/lib/journal/admin-journal";
import {
  loadAdminPipelineDetail,
  type AdminPipelineDetailViewModel,
} from "@/lib/admin/leads/admin-leads";
import {
  updateTriageStateAction,
  updateConsultationStatusAction,
  updateDealStatusAction,
  updateTrainingStatusAction,
  updateFollowUpAction,
  updateFounderNoteAction,
} from "@/lib/admin/leads/admin-leads-actions";
import {
  LEAD_TRIAGE_WORKFLOW,
  CONSULTATION_WORKFLOW,
  DEAL_WORKFLOW,
  TRAINING_WORKFLOW,
} from "@/lib/admin/leads/admin-leads-workflows";
import { getWorkflowActions } from "@/lib/admin/shared/admin-workflow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pipeline Detail",
  robots: { index: false, follow: false },
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function isOverdue(followUpAt: string | null | undefined): boolean {
  if (!followUpAt) return false;
  return new Date(followUpAt) < new Date();
}

function DetailField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? "col-span-full" : ""}>
      <dt className="text-xs text-foreground/50">{label}</dt>
      <dd className={`mt-0.5 text-sm text-foreground ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-foreground/12 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]">
      {label}
    </span>
  );
}

function OverdueWarning({ followUpAt }: { followUpAt: string | null | undefined }) {
  if (!isOverdue(followUpAt)) return null;
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-600">
      Follow-up overdue since {formatDate(followUpAt)}
    </div>
  );
}

// ── Lead detail ────────────────────────────────────────────────────────

function LeadDetail({ detail }: { detail: Extract<AdminPipelineDetailViewModel, { entityType: "lead" }> }) {
  const r = detail.record;
  const actions = getWorkflowActions(r.triageState, LEAD_TRIAGE_WORKFLOW);

  return (
    <AdminDetailShell
      main={
        <div className="grid gap-(--space-section-default)">
          <OverdueWarning followUpAt={detail.followUpAt} />

          {/* Workflow bar */}
          <form action={updateTriageStateAction}>
            <input type="hidden" name="id" value={r.id} />
            <AdminWorkflowBar actions={actions} currentStatus={r.triageState} />
          </form>

          {/* Qualification fields */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Lead Qualification</h2>
            <dl className="mt-(--space-3) grid grid-cols-2 gap-(--space-3) text-sm">
              <DetailField label="Name" value={r.name} />
              <DetailField label="Email" value={r.email} />
              <DetailField label="Organization" value={r.organization} />
              <DetailField label="Role / Title" value={r.roleOrTitle} />
              <DetailField label="Lane" value={r.lane} />
              <DetailField label="Authority level" value={r.authorityLevel} />
              <DetailField label="Urgency" value={r.urgency} />
              <DetailField label="Budget signal" value={r.budgetSignal} />
              <DetailField label="Training fit" value={r.trainingFit} />
              <DetailField label="Technical environment" value={r.technicalEnvironment} />
              <DetailField label="Training goal" value={r.trainingGoal} multiline />
              <DetailField label="Problem summary" value={r.problemSummary} multiline />
              <DetailField label="Recommended next action" value={r.recommendedNextAction} multiline />
            </dl>
          </section>

          {/* Founder note */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Founder Note</h2>
            <form action={updateFounderNoteAction} className="mt-(--space-2) grid gap-(--space-2)">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="entityType" value="lead" />
              <input type="hidden" name="currentStatus" value={r.triageState} />
              <p id="founder-note-desc" className="sr-only">Add a private note visible only to founders and admins.</p>
              <textarea
                name="founderNote"
                defaultValue={r.founderNote ?? ""}
                rows={3}
                aria-label="Founder note"
                aria-describedby="founder-note-desc"
                aria-invalid={false}
                className="w-full rounded-lg border border-foreground/12 bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                placeholder="Add a founder note…"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
                >
                  Save note
                </button>
              </div>
            </form>
          </section>

          {/* Follow-up scheduler */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Follow-up</h2>
            <form action={updateFollowUpAction} className="mt-(--space-3) flex items-center gap-(--space-2)">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="entityType" value="lead" />
              <input
                type="date"
                name="followUpAt"
                defaultValue={detail.followUpAt ?? ""}
                className="h-8 rounded-lg border border-foreground/12 bg-surface px-2 text-xs text-foreground"
              />
              <button
                type="submit"
                className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
              >
                Set follow-up
              </button>
            </form>
          </section>
        </div>
      }
      sidebar={
        <div className="grid gap-(--space-section-default)">
          {/* Timestamps */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Timeline</h2>
            <dl className="mt-(--space-2) grid gap-(--space-1) text-xs">
              <div className="flex justify-between text-foreground/60">
                <dt>Created</dt>
                <dd>{formatDate(r.createdAt)}</dd>
              </div>
              <div className="flex justify-between text-foreground/60">
                <dt>Last contacted</dt>
                <dd>{formatDate(r.lastContactedAt)}</dd>
              </div>
              <div className="flex justify-between text-foreground/60">
                <dt>Submitted</dt>
                <dd>{formatDate(r.submittedAt)}</dd>
              </div>
              <div className="flex justify-between text-foreground/60">
                <dt>Triaged</dt>
                <dd>{formatDate(r.triagedAt)}</dd>
              </div>
            </dl>
          </section>

          {/* Linked consultation */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Linked Consultation</h2>
            {detail.linkedConsultation ? (
              <div className="mt-(--space-2) text-xs text-foreground/60">
                <a href={`/admin/leads/${detail.linkedConsultation.id}`} className="text-foreground underline underline-offset-4">
                  {detail.linkedConsultation.requestSummary}
                </a>
                <p className="mt-1"><StatusBadge label={detail.linkedConsultation.status} /></p>
              </div>
            ) : (
              <p className="mt-(--space-2) text-xs text-foreground/40">No linked consultation.</p>
            )}
          </section>

          {/* Linked deal */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Linked Deal</h2>
            {detail.linkedDeal ? (
              <div className="mt-(--space-2) text-xs text-foreground/60">
                <a href={`/admin/leads/${detail.linkedDeal.id}`} className="text-foreground underline underline-offset-4">
                  {detail.linkedDeal.title}
                </a>
                <p className="mt-1"><StatusBadge label={detail.linkedDeal.status} /></p>
              </div>
            ) : (
              <p className="mt-(--space-2) text-xs text-foreground/40">No linked deal.</p>
            )}
          </section>
        </div>
      }
    />
  );
}

// ── Consultation detail ────────────────────────────────────────────────

function ConsultationDetail({ detail }: { detail: Extract<AdminPipelineDetailViewModel, { entityType: "consultation" }> }) {
  const r = detail.record;
  const actions = getWorkflowActions(r.status, CONSULTATION_WORKFLOW);

  return (
    <AdminDetailShell
      main={
        <div className="grid gap-(--space-section-default)">
          {/* Workflow bar */}
          <form action={updateConsultationStatusAction}>
            <input type="hidden" name="id" value={r.id} />
            <AdminWorkflowBar actions={actions} currentStatus={r.status} />
          </form>

          {/* Summary */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Consultation</h2>
            <dl className="mt-(--space-3) grid grid-cols-2 gap-(--space-3) text-sm">
              <DetailField label="Lane" value={r.lane} />
              <DetailField label="Status" value={r.status} />
              <DetailField label="Request summary" value={r.requestSummary} multiline />
            </dl>
          </section>

          {/* Founder note */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Founder Note</h2>
            <form action={updateFounderNoteAction} className="mt-(--space-2) grid gap-(--space-2)">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="entityType" value="consultation" />
              <input type="hidden" name="currentStatus" value={r.status} />
              <textarea
                name="founderNote"
                defaultValue={r.founderNote ?? ""}
                rows={3}
                className="w-full rounded-lg border border-foreground/12 bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                placeholder="Add a founder note…"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
                >
                  Save note
                </button>
              </div>
            </form>
          </section>
        </div>
      }
      sidebar={
        <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
          <h2 className="text-sm font-semibold text-foreground/60">Timeline</h2>
          <dl className="mt-(--space-2) grid gap-(--space-1) text-xs">
            <div className="flex justify-between text-foreground/60">
              <dt>Created</dt>
              <dd>{formatDate(r.createdAt)}</dd>
            </div>
            <div className="flex justify-between text-foreground/60">
              <dt>Updated</dt>
              <dd>{formatDate(r.updatedAt)}</dd>
            </div>
          </dl>
        </section>
      }
    />
  );
}

// ── Deal detail ────────────────────────────────────────────────────────

function DealDetail({ detail }: { detail: Extract<AdminPipelineDetailViewModel, { entityType: "deal" }> }) {
  const r = detail.record;
  const actions = getWorkflowActions(r.status, DEAL_WORKFLOW);

  return (
    <AdminDetailShell
      main={
        <div className="grid gap-(--space-section-default)">
          <OverdueWarning followUpAt={detail.followUpAt} />

          {/* Workflow bar */}
          <form action={updateDealStatusAction}>
            <input type="hidden" name="id" value={r.id} />
            <AdminWorkflowBar actions={actions} currentStatus={r.status} />
          </form>

          {/* Deal details */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Deal</h2>
            <dl className="mt-(--space-3) grid grid-cols-2 gap-(--space-3) text-sm">
              <DetailField label="Title" value={r.title} />
              <DetailField label="Organization" value={r.organizationName} />
              <DetailField label="Lane" value={r.lane} />
              <DetailField label="Service type" value={r.recommendedServiceType} />
              <DetailField label="Est. hours" value={r.estimatedHours?.toString()} />
              <DetailField label="Est. training days" value={r.estimatedTrainingDays?.toString()} />
              <DetailField label="Est. price" value={formatPrice(r.estimatedPrice)} />
              <DetailField label="Next action" value={r.nextAction} />
              <DetailField label="Problem summary" value={r.problemSummary} multiline />
              <DetailField label="Proposed scope" value={r.proposedScope} multiline />
              <DetailField label="Assumptions" value={r.assumptions} multiline />
              <DetailField label="Open questions" value={r.openQuestions} multiline />
            </dl>
          </section>

          {/* Founder & customer notes */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Notes</h2>
            <div className="mt-(--space-3) grid gap-(--space-3)">
              <div>
                <h3 className="text-xs text-foreground/50">Founder note</h3>
                <form action={updateFounderNoteAction} className="mt-1 grid gap-(--space-2)">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="entityType" value="deal" />
                  <input type="hidden" name="currentStatus" value={r.status} />
                  <textarea
                    name="founderNote"
                    defaultValue={r.founderNote ?? ""}
                    rows={3}
                    className="w-full rounded-lg border border-foreground/12 bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                    placeholder="Add a founder note…"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
                    >
                      Save note
                    </button>
                  </div>
                </form>
              </div>
              <div>
                <h3 className="text-xs text-foreground/50">Customer response note</h3>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                  {r.customerResponseNote || "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Follow-up scheduler */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Follow-up</h2>
            <form action={updateFollowUpAction} className="mt-(--space-3) flex items-center gap-(--space-2)">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="entityType" value="deal" />
              <input
                type="date"
                name="followUpAt"
                defaultValue={detail.followUpAt ?? ""}
                className="h-8 rounded-lg border border-foreground/12 bg-surface px-2 text-xs text-foreground"
              />
              <button
                type="submit"
                className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
              >
                Set follow-up
              </button>
            </form>
          </section>
        </div>
      }
      sidebar={
        <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
          <h2 className="text-sm font-semibold text-foreground/60">Timeline</h2>
          <dl className="mt-(--space-2) grid gap-(--space-1) text-xs">
            <div className="flex justify-between text-foreground/60">
              <dt>Created</dt>
              <dd>{formatDate(r.createdAt)}</dd>
            </div>
            <div className="flex justify-between text-foreground/60">
              <dt>Updated</dt>
              <dd>{formatDate(r.updatedAt)}</dd>
            </div>
          </dl>
        </section>
      }
    />
  );
}

// ── Training detail ────────────────────────────────────────────────────

function TrainingDetail({ detail }: { detail: Extract<AdminPipelineDetailViewModel, { entityType: "training" }> }) {
  const r = detail.record;
  const actions = getWorkflowActions(r.status, TRAINING_WORKFLOW);

  return (
    <AdminDetailShell
      main={
        <div className="grid gap-(--space-section-default)">
          {/* Workflow bar */}
          <form action={updateTrainingStatusAction}>
            <input type="hidden" name="id" value={r.id} />
            <AdminWorkflowBar actions={actions} currentStatus={r.status} />
          </form>

          {/* Training details */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Training Path</h2>
            <dl className="mt-(--space-3) grid grid-cols-2 gap-(--space-3) text-sm">
              <DetailField label="Current role / background" value={r.currentRoleOrBackground} />
              <DetailField label="Technical depth" value={r.technicalDepth} />
              <DetailField label="Primary goal" value={r.primaryGoal} />
              <DetailField label="Preferred format" value={r.preferredFormat} />
              <DetailField label="Apprenticeship interest" value={r.apprenticeshipInterest} />
              <DetailField label="Recommended path" value={r.recommendedPath} />
              <DetailField label="Next action" value={r.nextAction} />
              <DetailField label="Fit rationale" value={r.fitRationale} multiline />
              <DetailField label="Customer summary" value={r.customerSummary} multiline />
            </dl>
          </section>

          {/* Founder note */}
          <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
            <h2 className="text-sm font-semibold text-foreground/60">Founder Note</h2>
            <form action={updateFounderNoteAction} className="mt-(--space-2) grid gap-(--space-2)">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="entityType" value="training" />
              <input type="hidden" name="currentStatus" value={r.status} />
              <textarea
                name="founderNote"
                defaultValue={r.founderNote ?? ""}
                rows={3}
                className="w-full rounded-lg border border-foreground/12 bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-foreground/25 focus:ring-1 focus:ring-foreground/10"
                placeholder="Add a founder note…"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-foreground/8 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/14"
                >
                  Save note
                </button>
              </div>
            </form>
          </section>
        </div>
      }
      sidebar={
        <section className="rounded-xl border border-foreground/8 p-(--space-inset-panel)">
          <h2 className="text-sm font-semibold text-foreground/60">Timeline</h2>
          <dl className="mt-(--space-2) grid gap-(--space-1) text-xs">
            <div className="flex justify-between text-foreground/60">
              <dt>Created</dt>
              <dd>{formatDate(r.createdAt)}</dd>
            </div>
            <div className="flex justify-between text-foreground/60">
              <dt>Updated</dt>
              <dd>{formatDate(r.updatedAt)}</dd>
            </div>
          </dl>
        </section>
      }
    />
  );
}

// ── Page component ─────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  lead: "Lead",
  consultation: "Consultation",
  deal: "Deal",
  training: "Training Path",
};

export default async function AdminLeadsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageAccess();
  const { id } = await params;
  const detail = await loadAdminPipelineDetail(id);

  const entityLabel = ENTITY_LABELS[detail.entityType] ?? detail.entityType;
  const title =
    detail.entityType === "lead"
      ? detail.record.name ?? detail.record.id
      : detail.entityType === "deal"
        ? detail.record.title
        : detail.record.id;

  return (
    <AdminSection
      title={`${entityLabel}: ${title}`}
      description={`ID: ${detail.entityType === "lead" ? detail.record.id : detail.record.id}`}
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Leads", href: "/admin/leads" },
        { label: detail.record.id },
      ]}
    >
      <div className="px-(--space-inset-panel)">
        <AdminDetailShell
          backHref="/admin/leads"
          backLabel="All Leads"
          main={
            <div>
              {detail.entityType === "lead" && <LeadDetail detail={detail} />}
              {detail.entityType === "consultation" && <ConsultationDetail detail={detail} />}
              {detail.entityType === "deal" && <DealDetail detail={detail} />}
              {detail.entityType === "training" && <TrainingDetail detail={detail} />}
            </div>
          }
        />
      </div>
    </AdminSection>
  );
}

import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getBlogPostRepository } from "@/adapters/RepositoryFactory";
import {
  createJournalEditorialInteractor,
  parseDraftBodyForm,
  getWorkflowActionDescriptors,
  parseMetadataForm,
  parseRestoreForm,
  parseWorkflowForm,
} from "@/lib/journal/admin-journal-actions";
import { loadSinglePostAttribution } from "@/lib/admin/attribution/admin-attribution";
import { loadAdminJournalDetail, requireAdminPageAccess } from "@/lib/journal/admin-journal";
import {
  getAdminJournalDetailPath,
  getAdminJournalListPath,
  getAdminJournalPreviewPath,
} from "@/lib/journal/admin-journal-routes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal Post Admin",
  robots: {
    index: false,
    follow: false,
  },
};

function compactPreview(value: string | null | undefined, fallback: string, maxLength = 140): string {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  const resolved = normalized.length > 0 ? normalized : fallback;

  if (resolved.length <= maxLength) {
    return resolved;
  }

  return `${resolved.slice(0, maxLength - 1).trimEnd()}...`;
}

function getRestoreChangedFields(
  post: {
    title: string;
    description: string;
    standfirst?: string | null;
    content: string;
    sectionLabel: string;
    statusLabel: string;
  },
  revision: {
    snapshot: {
      title: string;
      description: string;
      standfirst: string | null;
      content: string;
    };
    sectionLabel: string;
    statusLabel: string;
  },
): string[] {
  const changedFields: string[] = [];

  if (post.title !== revision.snapshot.title) {
    changedFields.push("Title");
  }
  if (post.description !== revision.snapshot.description) {
    changedFields.push("Description");
  }
  if ((post.standfirst ?? "") !== (revision.snapshot.standfirst ?? "")) {
    changedFields.push("Standfirst");
  }
  if (post.sectionLabel !== revision.sectionLabel) {
    changedFields.push("Section");
  }
  if (post.statusLabel !== revision.statusLabel) {
    changedFields.push("Workflow");
  }
  if (post.content !== revision.snapshot.content) {
    changedFields.push("Body");
  }

  return changedFields;
}

export default async function AdminJournalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPageAccess();
  const { id } = await params;
  const detail = await loadAdminJournalDetail(id);
  const attribution = await loadSinglePostAttribution(detail.post.slug);
  const workflowActions = getWorkflowActionDescriptors(detail.post.status);

  async function refreshJournalAdminPaths(slug: string) {
    "use server";

    revalidatePath(getAdminJournalListPath());
    revalidatePath(getAdminJournalDetailPath(id));
    revalidatePath(getAdminJournalPreviewPath(slug));
  }

  async function saveMetadataAction(formData: FormData) {
    "use server";

    const user = await requireAdminPageAccess();
    const editorial = createJournalEditorialInteractor();
    await editorial.updateEditorialMetadata({
      postId: id,
      patch: parseMetadataForm(formData),
      actorUserId: user.id,
      changeNote: typeof formData.get("changeNote") === "string"
        ? String(formData.get("changeNote")).trim() || null
        : null,
    });

    const updated = await getBlogPostRepository().findById(id);
    if (!updated) {
      throw new Error(`Post not found after metadata save: ${id}`);
    }

    await refreshJournalAdminPaths(updated.slug);
    redirect(getAdminJournalDetailPath(id));
  }

  async function transitionWorkflowAction(formData: FormData) {
    "use server";

    const user = await requireAdminPageAccess();
    const editorial = createJournalEditorialInteractor();
    const input = parseWorkflowForm(formData);
    const updated = await editorial.transitionWorkflow({
      postId: id,
      nextStatus: input.nextStatus,
      actorUserId: user.id,
      changeNote: input.changeNote,
    });

    await refreshJournalAdminPaths(updated.slug);
    redirect(getAdminJournalDetailPath(id));
  }

  async function saveDraftBodyAction(formData: FormData) {
    "use server";

    const user = await requireAdminPageAccess();
    const editorial = createJournalEditorialInteractor();
    await editorial.updateDraftContent({
      postId: id,
      patch: parseDraftBodyForm(formData),
      actorUserId: user.id,
      changeNote: typeof formData.get("changeNote") === "string"
        ? String(formData.get("changeNote")).trim() || null
        : null,
    });

    const updated = await getBlogPostRepository().findById(id);
    if (!updated) {
      throw new Error(`Post not found after draft body save: ${id}`);
    }

    await refreshJournalAdminPaths(updated.slug);
    redirect(getAdminJournalDetailPath(id));
  }

  async function restoreRevisionAction(formData: FormData) {
    "use server";

    const user = await requireAdminPageAccess();
    const editorial = createJournalEditorialInteractor();
    const input = parseRestoreForm(formData);
    const restored = await editorial.restoreRevision({
      postId: id,
      revisionId: input.revisionId,
      actorUserId: user.id,
      changeNote: input.changeNote,
    });

    await refreshJournalAdminPaths(restored.slug);
    redirect(getAdminJournalDetailPath(id));
  }

  return (
    <div className="shell-page editorial-page-shell">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-(--space-8) px-(--space-frame-default) py-(--space-8)">
        <header className="flex flex-col gap-(--space-cluster-default) border-b border-foreground/10 pb-(--space-stack-default)">
          <div className="flex flex-wrap items-center gap-(--space-cluster-default) text-xs font-semibold uppercase tracking-[0.16em] text-foreground/46">
            <span>{detail.post.statusLabel}</span>
            <span>{detail.post.sectionLabel}</span>
            <span>{detail.post.slug}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{detail.post.title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-foreground/64 sm:text-base">{detail.post.description || "No description recorded yet."}</p>
          <div className="flex flex-wrap gap-(--space-stack-default) text-sm text-foreground/60">
            <span>Updated {detail.post.updatedLabel}</span>
            <span>{detail.post.publishedLabel === "Not published" ? "Not published" : `Published ${detail.post.publishedLabel}`}</span>
            <a href={detail.post.previewHref} className="underline underline-offset-4">Journal preview</a>
          </div>
        </header>

        <div className="grid gap-(--space-stack-default) lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <section className="grid gap-(--space-stack-default)">
            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <h2 className="text-lg font-semibold text-foreground">Metadata</h2>
              <form action={saveMetadataAction} className="mt-(--space-stack-default) grid gap-(--space-stack-default) sm:grid-cols-2">
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Title</span>
                  <input name="title" defaultValue={detail.post.title} className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Slug</span>
                  <input name="slug" defaultValue={detail.post.slug} className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66 sm:col-span-2">
                  <span className="font-medium text-foreground/72">Description</span>
                  <textarea name="description" defaultValue={detail.post.description} className="min-h-24 rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66 sm:col-span-2">
                  <span className="font-medium text-foreground/72">Standfirst</span>
                  <textarea name="standfirst" defaultValue={detail.post.standfirst ?? ""} placeholder="Optional standfirst for the journal article." className="min-h-20 rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Section</span>
                  <select name="section" defaultValue={detail.post.section ?? ""} className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground">
                    <option value="">Legacy / unset</option>
                    <option value="essay">Essay</option>
                    <option value="briefing">Briefing</option>
                  </select>
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Workflow</span>
                  <input readOnly value={detail.post.statusLabel} className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66 sm:col-span-2">
                  <span className="font-medium text-foreground/72">Metadata change note</span>
                  <input name="changeNote" defaultValue="" placeholder="Optional note describing this metadata edit." className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-(--space-cluster-default) border-t border-foreground/10 pt-(--space-stack-default)">
                  <p className="text-sm leading-6 text-foreground/60">Metadata edits record a revision before the change is applied.</p>
                  <button type="submit" className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-sm font-medium text-foreground">Save metadata</button>
                </div>
              </form>
            </article>

            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <h2 className="text-lg font-semibold text-foreground">Workflow actions</h2>
              <p className="mt-(--space-2) text-sm leading-6 text-foreground/60">Move the article through explicit editorial states using the shared journal interactor.</p>
              <div className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                {workflowActions.map((action) => (
                  <form key={action.nextStatus} action={transitionWorkflowAction} className="rounded-2xl border border-foreground/10 p-(--space-inset-panel)">
                    <input type="hidden" name="nextStatus" value={action.nextStatus} />
                    <div className="flex flex-wrap items-start justify-between gap-(--space-cluster-default)">
                      <div className="grid gap-(--space-1)">
                        <h3 className="text-sm font-semibold text-foreground">{action.label}</h3>
                        <p className="text-sm leading-6 text-foreground/60">{action.description}</p>
                      </div>
                      <button type="submit" className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-sm font-medium text-foreground">{action.label}</button>
                    </div>
                    <label className="mt-(--space-stack-default) grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                      <span className="font-medium text-foreground/72">Workflow change note</span>
                      <input
                        name="changeNote"
                        defaultValue=""
                        aria-label={`Workflow change note for ${action.label}`}
                        placeholder="Optional note for the revision timeline."
                        className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground"
                      />
                    </label>
                  </form>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <h2 className="text-lg font-semibold text-foreground">Draft body</h2>
              <p className="mt-(--space-2) text-sm leading-6 text-foreground/60">Body edits now flow through the canonical journal interactor and record a revision before the new draft content is saved.</p>
              <form action={saveDraftBodyAction} className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Draft body</span>
                  <textarea name="content" aria-label="Draft body" defaultValue={detail.post.content} className="min-h-80 w-full rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) font-mono text-sm text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Draft body change note</span>
                  <input name="changeNote" defaultValue="" placeholder="Optional note describing this draft revision." className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-(--space-cluster-default) border-t border-foreground/10 pt-(--space-stack-default)">
                  <p className="text-sm leading-6 text-foreground/60">Use this editor for canonical draft-body updates without bypassing revision history.</p>
                  <button type="submit" className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-sm font-medium text-foreground">Save draft body</button>
                </div>
              </form>
            </article>
          </section>

          <aside className="grid gap-(--space-stack-default)">
            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <div className="flex items-center justify-between gap-(--space-cluster-default)">
                <h2 className="text-lg font-semibold text-foreground">Hero images</h2>
                <a href={detail.heroImagesApiHref} className="text-sm underline underline-offset-4">Hero API</a>
              </div>
              {detail.heroCandidates.length === 0 ? (
                <p className="mt-(--space-stack-default) text-sm text-foreground/60">No hero candidates yet.</p>
              ) : (
                <ol className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                  {detail.heroCandidates.map((asset) => (
                    <li key={asset.id} className="rounded-2xl border border-foreground/10 p-(--space-inset-panel)">
                      <div className="flex items-center justify-between gap-(--space-cluster-default) text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">
                        <span>{asset.selectionState}</span>
                        <span>{asset.visibility}</span>
                      </div>
                      <img src={asset.imageHref} alt={asset.altText} className="mt-(--space-3) aspect-[16/9] w-full rounded-xl object-cover" />
                      <p className="mt-(--space-3) text-sm text-foreground">{asset.altText}</p>
                      <p className="mt-(--space-1) text-xs text-foreground/52">Created {asset.createdAtLabel}</p>
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <div className="flex items-center justify-between gap-(--space-cluster-default)">
                <h2 className="text-lg font-semibold text-foreground">Artifacts</h2>
                <a href={detail.artifactsApiHref} className="text-sm underline underline-offset-4">Artifact API</a>
              </div>
              {detail.artifacts.length === 0 ? (
                <p className="mt-(--space-stack-default) text-sm text-foreground/60">No artifacts recorded yet.</p>
              ) : (
                <ol className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                  {detail.artifacts.map((artifact) => (
                    <li key={artifact.id} className="rounded-2xl border border-foreground/10 p-(--space-inset-panel)">
                      <div className="flex items-center justify-between gap-(--space-cluster-default) text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">
                        <span>{artifact.artifactType}</span>
                        <span>{artifact.createdAtLabel}</span>
                      </div>
                      <p className="mt-(--space-3) text-sm leading-6 text-foreground/64">{artifact.summary}</p>
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <h2 className="text-lg font-semibold text-foreground">Revision history</h2>
              {detail.revisions.length === 0 ? (
                <p className="mt-(--space-stack-default) text-sm text-foreground/60">No revisions recorded yet.</p>
              ) : (
                <ol className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                  {detail.revisions.map((revision) => (
                    <li key={revision.id} className="rounded-2xl border border-foreground/10 p-(--space-inset-panel)">
                      {(() => {
                        const changedFields = getRestoreChangedFields(detail.post, revision);

                        return (
                          <>
                      <div className="flex flex-wrap gap-x-(--space-3) gap-y-(--space-2) text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">
                        <span>{revision.statusLabel}</span>
                        <span>{revision.sectionLabel}</span>
                        <span>{revision.createdAtLabel}</span>
                        <span>By {revision.createdByUserId}</span>
                      </div>
                      <p className="mt-(--space-3) text-sm font-medium text-foreground">{revision.snapshot.title}</p>
                      <p className="mt-(--space-1) text-sm leading-6 text-foreground/64">{revision.changeNoteLabel}</p>
                      <div className="mt-(--space-stack-default) rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-(--space-inset-panel)">
                        <div className="flex flex-wrap items-center justify-between gap-(--space-cluster-default)">
                          <h3 className="text-sm font-semibold text-foreground">Restore preview</h3>
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/52">
                            {changedFields.length === 0 ? "Matches current draft" : `Changes: ${changedFields.join(", ")}`}
                          </p>
                        </div>
                        <div className="mt-(--space-stack-default) grid gap-(--space-stack-default) sm:grid-cols-2">
                          <div className="grid gap-(--space-cluster-tight) rounded-2xl border border-foreground/10 bg-background p-(--space-inset-panel)">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">Current draft</p>
                            <p className="text-sm font-medium text-foreground">{detail.post.title}</p>
                            <p className="text-sm leading-6 text-foreground/64">{compactPreview(detail.post.description, "No description recorded yet.")}</p>
                            <p className="text-xs text-foreground/52">{detail.post.statusLabel} · {detail.post.sectionLabel}</p>
                            <p className="rounded-xl bg-foreground/[0.03] px-(--space-inset-compact) py-(--space-2) font-mono text-xs leading-5 text-foreground/72">{compactPreview(detail.post.content, "No draft body recorded yet.")}</p>
                          </div>
                          <div className="grid gap-(--space-cluster-tight) rounded-2xl border border-foreground/10 bg-background p-(--space-inset-panel)">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">Revision snapshot</p>
                            <p className="text-sm font-medium text-foreground">{revision.snapshot.title}</p>
                            <p className="text-sm leading-6 text-foreground/64">{compactPreview(revision.snapshot.description, "No description recorded yet.")}</p>
                            <p className="text-xs text-foreground/52">{revision.statusLabel} · {revision.sectionLabel}</p>
                            <p className="rounded-xl bg-foreground/[0.03] px-(--space-inset-compact) py-(--space-2) font-mono text-xs leading-5 text-foreground/72">{compactPreview(revision.snapshot.content, "No draft body recorded yet.")}</p>
                          </div>
                        </div>
                      </div>
                      <form action={restoreRevisionAction} className="mt-(--space-stack-default) grid gap-(--space-cluster-default) sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <input type="hidden" name="revisionId" value={revision.id} />
                        <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                          <span className="font-medium text-foreground/72">Restore note</span>
                          <input
                            name="changeNote"
                            defaultValue=""
                            aria-label={`Restore note for ${revision.id}`}
                            placeholder="Optional note for why this revision is being restored."
                            className="rounded-2xl border border-foreground/12 bg-foreground/[0.02] px-(--space-inset-default) py-(--space-inset-compact) text-foreground"
                          />
                        </label>
                        <button type="submit" className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-sm font-medium text-foreground">Restore revision</button>
                      </form>
                          </>
                        );
                      })()}
                    </li>
                  ))}
                </ol>
              )}
            </article>

            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <div className="flex items-center justify-between gap-(--space-cluster-default)">
                <h2 className="text-lg font-semibold text-foreground">Attribution</h2>
                <Link href="/admin/journal/attribution" className="text-sm underline underline-offset-4">Full report</Link>
              </div>
              {attribution ? (
                <dl className="mt-(--space-stack-default) grid grid-cols-2 gap-(--space-stack-default)">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">Conversations</dt>
                    <dd className="mt-(--space-1) text-lg font-semibold tabular-nums text-foreground">{attribution.conversationsSourced}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">Leads</dt>
                    <dd className="mt-(--space-1) text-lg font-semibold tabular-nums text-foreground">{attribution.leadsGenerated}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">Deals</dt>
                    <dd className="mt-(--space-1) text-lg font-semibold tabular-nums text-foreground">{attribution.dealsGenerated}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">Est. Revenue</dt>
                    <dd className="mt-(--space-1) text-lg font-semibold tabular-nums text-foreground">
                      {attribution.estimatedRevenue > 0 ? `$${attribution.estimatedRevenue.toLocaleString()}` : "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-(--space-stack-default) text-sm text-foreground/60">No attribution data for this article yet.</p>
              )}
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
}

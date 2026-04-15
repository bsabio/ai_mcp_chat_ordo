import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import Image from "next/image";
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
import {
  loadAdminJournalDetail,
  requireAdminPageAccess,
  requireJournalWorkspaceAccess,
} from "@/lib/journal/admin-journal";
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
  await requireJournalWorkspaceAccess();
  const { id } = await params;
  const detail = await loadAdminJournalDetail(id);
  const attribution = await loadSinglePostAttribution(detail.post.slug);
  const workflowActions = getWorkflowActionDescriptors(detail.post.status);
  const isPublished = detail.post.status === "published";
  const selectedHeroAsset = detail.heroCandidates.find((asset) => asset.selectionState.toLowerCase() === "selected") ?? detail.heroCandidates[0] ?? null;

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

  async function publishArticleAction() {
    "use server";

    const user = await requireAdminPageAccess();
    const editorial = createJournalEditorialInteractor();
    const updated = await editorial.publishPost({
      postId: id,
      actorUserId: user.id,
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

        <div className="grid gap-(--space-stack-default) lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section className="grid gap-(--space-stack-default)">
            <article className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <div className="flex flex-wrap items-start justify-between gap-(--space-cluster-default)">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Editor</h2>
                  <p className="mt-(--space-2) text-sm leading-6 text-foreground/60">Edit the article first. Publishing and diagnostics stay in the sidebar like a conventional CMS.</p>
                </div>
              </div>
              <form id="draft-body-form" action={saveDraftBodyAction} className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Title</span>
                  <input name="titlePreview" value={detail.post.title} readOnly className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-lg font-semibold text-foreground" />
                </label>
                <div className="sticky top-4 z-10 flex flex-wrap items-center justify-between gap-(--space-cluster-default) rounded-2xl border border-foreground/10 bg-background/95 p-(--space-inset-panel) shadow-sm backdrop-blur supports-backdrop-filter:bg-background/85">
                  <p className="text-sm leading-6 text-foreground/60">
                    Current state: {detail.post.statusLabel}. {isPublished ? "This version is already live." : "Publish whenever the draft is ready."}
                  </p>
                  <div className="flex flex-wrap items-center gap-(--space-cluster-tight)">
                    <button type="submit" className="rounded-full border border-foreground/16 bg-foreground px-(--space-inset-default) py-(--space-2) text-sm font-medium text-background">Save draft body</button>
                  </div>
                </div>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Draft body</span>
                  <textarea name="content" aria-label="Draft body" defaultValue={detail.post.content} className="min-h-80 w-full rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) font-mono text-sm text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Draft note</span>
                  <input name="changeNote" defaultValue="" placeholder="Optional note for why this body revision is being recorded." className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
              </form>
            </article>

            <details className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)" open>
              <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">Post settings</summary>
              <p className="mt-(--space-2) text-sm leading-6 text-foreground/60">Edit the permalink, summary, standfirst, and section without burying the main writing surface.</p>
              <form action={saveMetadataAction} className="mt-(--space-stack-default) grid gap-(--space-stack-default) sm:grid-cols-2">
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Title</span>
                  <input name="title" defaultValue={detail.post.title} className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Slug</span>
                  <input name="slug" defaultValue={detail.post.slug} className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66 sm:col-span-2">
                  <span className="font-medium text-foreground/72">Description</span>
                  <textarea name="description" defaultValue={detail.post.description} className="min-h-24 rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66 sm:col-span-2">
                  <span className="font-medium text-foreground/72">Standfirst</span>
                  <textarea name="standfirst" defaultValue={detail.post.standfirst ?? ""} placeholder="Optional standfirst for the journal article." className="min-h-20 rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground" />
                </label>
                <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                  <span className="font-medium text-foreground/72">Section</span>
                  <select name="section" defaultValue={detail.post.section ?? ""} className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground">
                    <option value="">Legacy / unset</option>
                    <option value="essay">Essay</option>
                    <option value="briefing">Briefing</option>
                  </select>
                </label>
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-(--space-cluster-default) border-t border-foreground/10 pt-(--space-stack-default)">
                  <p className="text-sm leading-6 text-foreground/60">Metadata changes use the default revision note when no explicit note is required.</p>
                  <button type="submit" className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-sm font-medium text-foreground">Save settings</button>
                </div>
              </form>
            </details>

            <details className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">Revision history</summary>
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
                            <div className="mt-(--space-stack-default) rounded-2xl border border-foreground/10 bg-foreground/2 p-(--space-inset-panel)">
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
                                  <p className="rounded-xl bg-foreground/3 px-(--space-inset-compact) py-(--space-2) font-mono text-xs leading-5 text-foreground/72">{compactPreview(detail.post.content, "No draft body recorded yet.")}</p>
                                </div>
                                <div className="grid gap-(--space-cluster-tight) rounded-2xl border border-foreground/10 bg-background p-(--space-inset-panel)">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">Revision snapshot</p>
                                  <p className="text-sm font-medium text-foreground">{revision.snapshot.title}</p>
                                  <p className="text-sm leading-6 text-foreground/64">{compactPreview(revision.snapshot.description, "No description recorded yet.")}</p>
                                  <p className="text-xs text-foreground/52">{revision.statusLabel} · {revision.sectionLabel}</p>
                                  <p className="rounded-xl bg-foreground/3 px-(--space-inset-compact) py-(--space-2) font-mono text-xs leading-5 text-foreground/72">{compactPreview(revision.snapshot.content, "No draft body recorded yet.")}</p>
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
                                  className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground"
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
            </details>
          </section>

          <aside className="grid gap-(--space-stack-default) lg:sticky lg:top-4">
            <article id="journal-publish-panel" className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <div className="grid gap-(--space-2)">
                <h2 className="text-lg font-semibold text-foreground">Publish</h2>
                <p aria-label={`Current publishing status: ${detail.post.statusLabel}`} className="text-sm text-foreground/60">Status: {detail.post.statusLabel}</p>
                <p className="text-sm text-foreground/60">Updated {detail.post.updatedLabel}</p>
                <p className="text-sm text-foreground/60">{detail.post.publishedLabel === "Not published" ? "Not published yet" : `Published ${detail.post.publishedLabel}`}</p>
                <a href={detail.post.previewHref} className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-center text-sm font-medium text-foreground">Preview</a>
                {isPublished ? (
                  <a href={detail.post.previewHref} className="rounded-full border border-foreground/16 bg-foreground px-(--space-inset-default) py-(--space-2) text-center text-sm font-medium text-background">View published</a>
                ) : (
                  <form id="publish-article-form" action={publishArticleAction}>
                    <button type="submit" className="w-full rounded-full border border-foreground/16 bg-foreground px-(--space-inset-default) py-(--space-2) text-sm font-medium text-background">Publish article</button>
                  </form>
                )}
              </div>
            </article>

            <details className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">Featured image</summary>
              {selectedHeroAsset ? (
                <div className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-foreground/10">
                    <Image
                      src={selectedHeroAsset.imageHref}
                      alt={selectedHeroAsset.altText}
                      fill
                      unoptimized
                      sizes="320px"
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm text-foreground">{selectedHeroAsset.altText}</p>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-foreground/46">
                    <span>{selectedHeroAsset.selectionState}</span>
                    <span>{selectedHeroAsset.visibility}</span>
                  </div>
                  <a href={detail.heroImagesApiHref} className="text-sm underline underline-offset-4">Manage hero images</a>
                </div>
              ) : (
                <p className="mt-(--space-stack-default) text-sm text-foreground/60">No hero image selected yet.</p>
              )}
            </details>

            <details className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">Advanced workflow</summary>
              <p className="mt-(--space-3) text-sm leading-6 text-foreground/60">Use manual transitions only when you need to move backward or avoid a direct publish.</p>
              {workflowActions.length === 0 ? (
                <p className="mt-(--space-3) text-sm text-foreground/60">No additional manual workflow changes are available.</p>
              ) : (
                <form id="workflow-transition-form" action={transitionWorkflowAction} className="mt-(--space-stack-default) grid gap-(--space-stack-default)">
                  <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                    <span className="font-medium text-foreground/72">Manual status</span>
                    <select name="nextStatus" defaultValue={workflowActions[0]?.nextStatus} className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground">
                      {workflowActions.map((action) => (
                        <option key={action.nextStatus} value={action.nextStatus}>{action.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-(--space-cluster-tight) text-sm text-foreground/66">
                    <span className="font-medium text-foreground/72">Workflow note</span>
                    <input
                      name="changeNote"
                      defaultValue=""
                      aria-label="Workflow note"
                      placeholder="Optional note for why this manual status change is being recorded."
                      className="rounded-2xl border border-foreground/12 bg-foreground/2 px-(--space-inset-default) py-(--space-inset-compact) text-foreground"
                    />
                  </label>
                  <button type="submit" className="rounded-full border border-foreground/16 px-(--space-inset-default) py-(--space-2) text-sm font-medium text-foreground">Update status</button>
                </form>
              )}
            </details>

            <details className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">Artifacts</summary>
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
              <a href={detail.artifactsApiHref} className="mt-(--space-stack-default) inline-block text-sm underline underline-offset-4">Artifact API</a>
            </details>

            <details className="rounded-3xl border border-foreground/10 bg-background p-(--space-inset-panel)">
              <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">Attribution</summary>
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
              <Link href="/admin/journal/attribution" className="mt-(--space-stack-default) inline-block text-sm underline underline-offset-4">Full report</Link>
            </details>
          </aside>
        </div>
      </div>
    </div>
  );
}

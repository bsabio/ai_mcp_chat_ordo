"use client";

import React from "react";
import type { ToolPluginProps } from "../../registry/types";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityArtifactRail } from "../../primitives/CapabilityArtifactRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { CapabilityDisclosure } from "../../primitives/CapabilityDisclosure";
import { CapabilityMetricStrip } from "../../primitives/CapabilityMetricStrip";
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";

type JournalPostRecord = {
  id: string;
  slug?: string;
  title: string;
  status?: string;
  section?: string | null;
  standfirst?: string | null;
  hero_image_asset_id?: string | null;
  preview_route?: string;
  detail_route?: string;
  public_route?: string | null;
};

type JournalRevisionRecord = {
  id: string;
  post_id: string;
  status: string;
  section: string | null;
  change_note: string | null;
  created_at: string;
  created_by_user_id: string;
};

type JournalActiveJob = {
  job_id: string;
  tool_name: string;
  status: string;
  title?: string;
  summary?: string;
  updated_at: string | null;
};

type JournalQaReport = {
  approved: boolean;
  summary: string;
  findings: Array<{ severity: string; issue: string }>;
};

type JournalWorkflowSummary = {
  action: "get_journal_workflow_summary";
  summary: string;
  counts: {
    draft: number;
    review: number;
    approved: number;
    blocked: number;
    ready_to_publish: number;
    active_jobs: number;
  };
  blocked_posts?: Array<JournalPostRecord & { blockers: string[] }>;
  in_review_posts?: JournalPostRecord[];
  ready_to_publish_posts?: JournalPostRecord[];
  active_jobs?: JournalActiveJob[];
};

type PrepareJournalPost = {
  action: "prepare_journal_post_for_publish";
  ready: boolean;
  summary: string;
  blockers: string[];
  revision_count: number;
  active_jobs?: JournalActiveJob[];
  qa_report?: JournalQaReport | null;
  post: JournalPostRecord;
};

type ListJournalPostsResult = {
  action: "list_journal_posts";
  list_route: string;
  filters: {
    search: string;
    status: string;
    section: string;
    limit: number;
  };
  counts: {
    all: number;
    draft: number;
    review: number;
    approved: number;
    published: number;
  };
  posts: JournalPostRecord[];
  summary: string;
};

type GetJournalPostResult = {
  action: "get_journal_post";
  post: JournalPostRecord;
  summary: string;
};

type ListJournalRevisionsResult = {
  action: "list_journal_revisions";
  post: {
    id: string;
    title: string;
    status: string;
    detail_route: string;
  };
  revisions: JournalRevisionRecord[];
  summary: string;
};

type JournalMutationResult = {
  action:
    | "update_journal_metadata"
    | "update_journal_draft"
    | "submit_journal_review"
    | "approve_journal_post"
    | "publish_journal_post"
    | "restore_journal_revision";
  post: JournalPostRecord;
  summary: string;
};

type SelectJournalHeroImageResult = {
  action: "select_journal_hero_image";
  post_id: string;
  asset_id: string;
  preview_route: string | null;
  summary: string;
  hero_image: {
    post_slug: string | null;
    visibility: string;
    image_url: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function detailValue(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function createContextItems(items: Array<{ label: string; value: React.ReactNode }>) {
  return items.filter((item) => item.value != null && item.value !== false && item.value !== "");
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function createPostArtifactItems(post: JournalPostRecord) {
  return [
    detailValue(post.detail_route)
      ? { label: "Open workspace", href: post.detail_route as string, meta: "Admin detail" }
      : null,
    detailValue(post.preview_route)
      ? { label: "Open draft", href: post.preview_route as string, meta: "Preview route" }
      : null,
    detailValue(post.public_route ?? undefined)
      ? { label: "Open published article", href: post.public_route as string, meta: "Public route" }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
}

function isWorkflowSummary(value: unknown): value is JournalWorkflowSummary {
  return (
    typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === "get_journal_workflow_summary"
    && typeof (value as { summary?: unknown }).summary === "string"
    && typeof (value as { counts?: unknown }).counts === "object"
    && (value as { counts?: unknown }).counts !== null
  );
}

function isPreparePost(value: unknown): value is PrepareJournalPost {
  return (
    typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === "prepare_journal_post_for_publish"
    && typeof (value as { ready?: unknown }).ready === "boolean"
    && typeof (value as { summary?: unknown }).summary === "string"
    && typeof (value as { post?: unknown }).post === "object"
    && (value as { post?: unknown }).post !== null
  );
}

function isListJournalPostsResult(value: unknown): value is ListJournalPostsResult {
  return isRecord(value) && value.action === "list_journal_posts" && Array.isArray(value.posts);
}

function isGetJournalPostResult(value: unknown): value is GetJournalPostResult {
  return isRecord(value) && value.action === "get_journal_post" && isRecord(value.post);
}

function isListJournalRevisionsResult(value: unknown): value is ListJournalRevisionsResult {
  return isRecord(value) && value.action === "list_journal_revisions" && Array.isArray(value.revisions);
}

function isJournalMutationResult(value: unknown): value is JournalMutationResult {
  return (
    isRecord(value)
    && [
      "update_journal_metadata",
      "update_journal_draft",
      "submit_journal_review",
      "approve_journal_post",
      "publish_journal_post",
      "restore_journal_revision",
    ].includes(String(value.action))
    && isRecord(value.post)
  );
}

function isSelectJournalHeroImageResult(value: unknown): value is SelectJournalHeroImageResult {
  return (
    isRecord(value)
    && value.action === "select_journal_hero_image"
    && typeof value.post_id === "string"
    && typeof value.asset_id === "string"
    && isRecord(value.hero_image)
  );
}

function WorkflowSummaryView({
  result,
  props,
}: {
  result: JournalWorkflowSummary;
  props: ToolPluginProps;
}) {
  const { computedActions = [], onActionClick, part, descriptor } = props;
  const label = part?.label ?? descriptor?.label ?? "Journal workflow";

  return (
    <CapabilityCardShell
      descriptor={descriptor}
      state={part?.status ?? "succeeded"}
      ariaLabel={`${label} result`}
    >
      <CapabilityCardHeader
        eyebrow={label}
        title="Journal workflow summary"
        statusLabel={result.counts.ready_to_publish > 0 ? "Ready items" : result.counts.blocked > 0 ? "Blocked items" : "Stable"}
      />
      <p className="ui-capability-card-summary">{result.summary}</p>
      <CapabilityMetricStrip
        items={[
          { label: "Draft", value: String(result.counts.draft) },
          { label: "Review", value: String(result.counts.review) },
          { label: "Approved", value: String(result.counts.approved) },
          { label: "Blocked", value: String(result.counts.blocked) },
          { label: "Ready", value: String(result.counts.ready_to_publish) },
          { label: "Active jobs", value: String(result.counts.active_jobs) },
        ]}
      />
      <CapabilityArtifactRail
        title="Priority posts"
        items={[
          ...(result.blocked_posts ?? []).slice(0, 3).map((post) => ({
            label: post.title,
            href: post.detail_route,
            meta: `Blocked · ${post.blockers.length} blocker${post.blockers.length === 1 ? "" : "s"}`,
          })),
          ...(result.ready_to_publish_posts ?? []).slice(0, 3).map((post) => ({
            label: post.title,
            href: post.detail_route,
            meta: "Ready to publish",
          })),
        ]}
      />
      {(result.blocked_posts?.length ?? 0) > 0 ? (
        <CapabilityDisclosure label="Blocked posts">
          <ul className="flex flex-col gap-(--space-2)">
            {result.blocked_posts?.map((post) => (
              <li key={post.id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{post.title}</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">{post.blockers.join(" ")}</p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
      ) : null}
      {(result.active_jobs?.length ?? 0) > 0 ? (
        <CapabilityDisclosure label="Active jobs">
          <ul className="flex flex-col gap-(--space-2)">
            {result.active_jobs?.map((job) => (
              <li key={job.job_id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{formatLabel(job.tool_name)}</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">
                  {formatLabel(job.status)}{job.summary ? ` · ${job.summary}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
      ) : null}
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
}

function PreparePostView({
  result,
  props,
}: {
  result: PrepareJournalPost;
  props: ToolPluginProps;
}) {
  const { computedActions = [], onActionClick, part, descriptor } = props;
  const label = part?.label ?? descriptor?.label ?? "Journal publish readiness";

  return (
    <CapabilityCardShell
      descriptor={descriptor}
      state={part?.status ?? "succeeded"}
      ariaLabel={`${label} result`}
    >
      <CapabilityCardHeader
        eyebrow={label}
        title={result.post.title}
        statusLabel={result.ready ? "Ready to publish" : "Blocked"}
      />
      <p className="ui-capability-card-summary">{result.summary}</p>
      <CapabilityMetricStrip
        items={[
          { label: "Blockers", value: String(result.blockers.length) },
          { label: "Revisions", value: String(result.revision_count) },
          { label: "Active jobs", value: String(result.active_jobs?.length ?? 0) },
          { label: "QA", value: result.qa_report ? (result.qa_report.approved ? "Approved" : "Needs review") : "Skipped" },
        ]}
      />
      <CapabilityContextPanel
        items={createContextItems([
          { label: "Status", value: detailValue(result.post.status) ? formatLabel(result.post.status as string) : null },
          { label: "Section", value: detailValue(result.post.section ?? undefined) },
          { label: "Standfirst", value: detailValue(result.post.standfirst ?? undefined) },
        ])}
      />
      <CapabilityArtifactRail title="Post routes" items={createPostArtifactItems(result.post)} />
      {result.blockers.length > 0 ? (
        <CapabilityDisclosure label="Blockers">
          <ul className="flex flex-col gap-(--space-2)">
            {result.blockers.map((blocker, index) => (
              <li key={`${result.post.id}-blocker-${index}`} className="ui-capability-context-item">
                <p className="text-sm text-foreground/72">{blocker}</p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
      ) : null}
      {result.qa_report ? (
        <CapabilityDisclosure label="QA report">
          <div className="flex flex-col gap-(--space-2)">
            <p className="text-sm font-medium text-foreground">{result.qa_report.summary}</p>
            {result.qa_report.findings.length > 0 ? (
              <ul className="flex flex-col gap-(--space-2)">
                {result.qa_report.findings.map((finding, index) => (
                  <li key={`qa-${index}`} className="ui-capability-context-item">
                    <p className="text-sm text-foreground/72">{finding.severity}: {finding.issue}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </CapabilityDisclosure>
      ) : null}
      {(result.active_jobs?.length ?? 0) > 0 ? (
        <CapabilityDisclosure label="Active jobs">
          <ul className="flex flex-col gap-(--space-2)">
            {result.active_jobs?.map((job) => (
              <li key={job.job_id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{formatLabel(job.tool_name)}</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">
                  {formatLabel(job.status)}{job.summary ? ` · ${job.summary}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
      ) : null}
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
}

export const JournalWorkflowCard: React.FC<ToolPluginProps> = (props) => {
  const { toolCall, resultEnvelope, onActionClick } = props;
  if (!toolCall) return <JobStatusFallbackCard {...props} />;

  const result = resultEnvelope?.payload ?? toolCall.result;

  if (isWorkflowSummary(result)) {
    return <WorkflowSummaryView result={result} props={props} />;
  }

  if (isPreparePost(result)) {
    return <PreparePostView result={result} props={props} />;
  }

  if (isListJournalPostsResult(result)) {
    const label = resolveCapabilityDisplayLabel({
      toolName: toolCall.name,
      explicitLabel: props.part?.label,
      descriptorLabel: props.descriptor?.label,
      fallbackLabel: "Journal workflow",
    });

    return (
      <CapabilityCardShell descriptor={props.descriptor} state={props.part?.status ?? "succeeded"} ariaLabel={`${label} result`}>
        <CapabilityCardHeader eyebrow={label} title="Journal posts" statusLabel={`${result.posts.length} loaded`} />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityMetricStrip
          items={[
            { label: "All", value: String(result.counts.all) },
            { label: "Draft", value: String(result.counts.draft) },
            { label: "Review", value: String(result.counts.review) },
            { label: "Approved", value: String(result.counts.approved) },
            { label: "Published", value: String(result.counts.published) },
          ]}
        />
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Search", value: detailValue(result.filters.search) },
            { label: "Status filter", value: formatLabel(result.filters.status) },
            { label: "Section filter", value: formatLabel(result.filters.section) },
            { label: "Limit", value: String(result.filters.limit) },
          ])}
        />
        <CapabilityArtifactRail
          title="Posts"
          items={result.posts.slice(0, 6).map((post) => ({
            label: post.title,
            href: post.detail_route,
            meta: `${detailValue(post.status) ? formatLabel(post.status as string) : "Unknown status"}${detailValue(post.section ?? undefined) ? ` · ${formatLabel(post.section as string)}` : ""}`,
          }))}
        />
        <CapabilityDisclosure label="Post list">
          <ul className="flex flex-col gap-(--space-2)">
            {result.posts.map((post) => (
              <li key={post.id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{post.title}</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">
                  {detailValue(post.status) ? formatLabel(post.status as string) : "Unknown status"}{detailValue(post.standfirst ?? undefined) ? ` · ${post.standfirst}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
        <CapabilityArtifactRail title="Admin list" items={[{ label: "Open journal list", href: result.list_route, meta: "Admin workspace" }]} />
        <CapabilityActionRail actions={props.computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isGetJournalPostResult(result)) {
    const label = resolveCapabilityDisplayLabel({
      toolName: toolCall.name,
      explicitLabel: props.part?.label,
      descriptorLabel: props.descriptor?.label,
      fallbackLabel: "Journal workflow",
    });

    return (
      <CapabilityCardShell descriptor={props.descriptor} state={props.part?.status ?? "succeeded"} ariaLabel={`${label} result`}>
        <CapabilityCardHeader
          eyebrow={label}
          title={result.post.title}
          statusLabel={detailValue(result.post.status) ? formatLabel(result.post.status as string) : "Loaded"}
        />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Section", value: detailValue(result.post.section ?? undefined) },
            { label: "Standfirst", value: detailValue(result.post.standfirst ?? undefined) },
            { label: "Hero asset", value: detailValue(result.post.hero_image_asset_id ?? undefined) },
          ])}
        />
        <CapabilityArtifactRail title="Post routes" items={createPostArtifactItems(result.post)} />
        <CapabilityActionRail actions={props.computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isListJournalRevisionsResult(result)) {
    const label = resolveCapabilityDisplayLabel({
      toolName: toolCall.name,
      explicitLabel: props.part?.label,
      descriptorLabel: props.descriptor?.label,
      fallbackLabel: "Journal workflow",
    });

    return (
      <CapabilityCardShell descriptor={props.descriptor} state={props.part?.status ?? "succeeded"} ariaLabel={`${label} result`}>
        <CapabilityCardHeader eyebrow={label} title={result.post.title} statusLabel={`${result.revisions.length} revisions`} />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Current status", value: formatLabel(result.post.status) },
            { label: "Workspace", value: result.post.detail_route },
          ])}
        />
        <CapabilityArtifactRail title="Post routes" items={[{ label: "Open workspace", href: result.post.detail_route, meta: "Admin detail" }]} />
        <CapabilityDisclosure label="Revision history">
          <ul className="flex flex-col gap-(--space-2)">
            {result.revisions.map((revision) => (
              <li key={revision.id} className="ui-capability-context-item">
                <p className="text-sm font-medium text-foreground">{revision.id}</p>
                <p className="mt-(--space-2) text-sm text-foreground/72">
                  {formatLabel(revision.status)} · {detailValue(revision.section) ? formatLabel(revision.section as string) : "No section"} · {revision.created_at}
                </p>
                {detailValue(revision.change_note) ? (
                  <p className="mt-(--space-2) text-sm text-foreground/72">{revision.change_note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </CapabilityDisclosure>
        <CapabilityActionRail actions={props.computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isJournalMutationResult(result)) {
    const label = resolveCapabilityDisplayLabel({
      toolName: toolCall.name,
      explicitLabel: props.part?.label,
      descriptorLabel: props.descriptor?.label,
      fallbackLabel: "Journal workflow",
    });

    return (
      <CapabilityCardShell descriptor={props.descriptor} state={props.part?.status ?? "succeeded"} ariaLabel={`${label} result`}>
        <CapabilityCardHeader
          eyebrow={label}
          title={result.post.title}
          statusLabel={detailValue(result.post.status) ? formatLabel(result.post.status as string) : "Updated"}
        />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Section", value: detailValue(result.post.section ?? undefined) },
            { label: "Standfirst", value: detailValue(result.post.standfirst ?? undefined) },
            { label: "Hero asset", value: detailValue(result.post.hero_image_asset_id ?? undefined) },
          ])}
        />
        <CapabilityArtifactRail title="Post routes" items={createPostArtifactItems(result.post)} />
        <CapabilityActionRail actions={props.computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isSelectJournalHeroImageResult(result)) {
    const label = resolveCapabilityDisplayLabel({
      toolName: toolCall.name,
      explicitLabel: props.part?.label,
      descriptorLabel: props.descriptor?.label,
      fallbackLabel: "Journal workflow",
    });

    return (
      <CapabilityCardShell descriptor={props.descriptor} state={props.part?.status ?? "succeeded"} ariaLabel={`${label} result`}>
        <CapabilityCardHeader eyebrow={label} title="Hero image selected" statusLabel={formatLabel(result.hero_image.visibility)} />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/70">
          <img
            src={result.hero_image.image_url}
            alt={result.hero_image.post_slug ? `Hero image for ${result.hero_image.post_slug}` : "Selected hero image"}
            className="h-auto w-full object-cover"
          />
        </div>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Post id", value: result.post_id },
            { label: "Asset id", value: result.asset_id },
            { label: "Preview route", value: detailValue(result.preview_route ?? undefined) },
          ])}
        />
        <CapabilityArtifactRail
          title="Image routes"
          items={[
            result.preview_route
              ? { label: "Open draft", href: result.preview_route, meta: "Preview route" }
              : null,
            { label: "Open image", href: result.hero_image.image_url, meta: "Image asset" },
          ].filter((item): item is NonNullable<typeof item> => item !== null)}
        />
        <CapabilityActionRail actions={props.computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  return <JobStatusFallbackCard {...props} />;
};

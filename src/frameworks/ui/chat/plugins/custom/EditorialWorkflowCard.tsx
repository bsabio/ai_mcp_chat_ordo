"use client";

import React from "react";

import type { ToolPluginProps } from "../../registry/types";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { CapabilityDisclosure } from "../../primitives/CapabilityDisclosure";
import { CapabilityMetricStrip } from "../../primitives/CapabilityMetricStrip";
import { CapabilityTimeline } from "../../primitives/CapabilityTimeline";
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";
import {
  isComposeBlogArticleResultPayload,
  isDraftContentResultPayload,
  isGenerateBlogImagePromptResultPayload,
  isGenerateBlogImageResultPayload,
  isProduceBlogArticleResultPayload,
  isPublishContentResultPayload,
  isQaBlogArticleResultPayload,
  isResolveBlogArticleQaResultPayload,
  type QaBlogArticleFindingPayload,
} from "@/lib/blog/blog-tool-payloads";

function summarizeContent(content: string, maxLength = 280): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function detailValue(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function severityTone(severity: QaBlogArticleFindingPayload["severity"]): string {
  switch (severity) {
    case "high":
      return "bg-[color:color-mix(in_srgb,var(--danger,#b42318)_14%,var(--surface))] text-[color:var(--danger,#b42318)]";
    case "medium":
      return "bg-[color:color-mix(in_srgb,var(--warning,#b54708)_14%,var(--surface))] text-[color:var(--warning,#b54708)]";
    case "low":
    default:
      return "bg-[color:color-mix(in_srgb,var(--accent)_10%,var(--surface))] text-accent";
  }
}

function createContextItems(items: Array<{ label: string; value: string | null }>) {
  return items
    .filter((item) => item.value)
    .map((item) => ({
      label: item.label,
      value: item.value as string,
    }));
}

function formatStageLabel(stage: string): string {
  return stage
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export const EditorialWorkflowCard: React.FC<ToolPluginProps> = (props) => {
  const {
    toolCall,
    part,
    computedActions = [],
    onActionClick,
    resultEnvelope,
  } = props;

  if (!toolCall) {
    return <JobStatusFallbackCard {...props} />;
  }

  const label = resolveCapabilityDisplayLabel({
    toolName: toolCall.name,
    explicitLabel: part?.label,
    descriptorLabel: props.descriptor?.label,
    fallbackLabel: "Editorial workflow",
  });
  const result = resultEnvelope?.payload ?? toolCall.result;
  const state = part?.status ?? "succeeded";
  const sharedShellProps = {
    descriptor: props.descriptor,
    state,
    ariaLabel: `${label} result`,
  } as const;

  if (isDraftContentResultPayload(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title={result.title} statusLabel="Draft" />
        <p className="ui-capability-card-summary">
          {part?.summary ?? result.description ?? `Draft saved at /journal/${result.slug}.`}
        </p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Status", value: "Draft" },
            { label: "Slug", value: `/journal/${result.slug}` },
            { label: "Created", value: detailValue(result.createdAt) },
          ])}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isPublishContentResultPayload(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title={result.title} statusLabel="Published" />
        <p className="ui-capability-card-summary">
          {part?.summary ?? `Published at /journal/${result.slug}.`}
        </p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Status", value: "Published" },
            { label: "Route", value: `/journal/${result.slug}` },
            { label: "Published", value: detailValue(result.publishedAt ?? undefined) },
          ])}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isComposeBlogArticleResultPayload(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title={result.title} statusLabel="Draft prepared" />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityContextPanel
          items={createContextItems([{ label: "Description", value: result.description }])}
        />
        <CapabilityDisclosure label="Draft preview">
          <p className="ui-capability-card-summary">{summarizeContent(result.content)}</p>
        </CapabilityDisclosure>
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isQaBlogArticleResultPayload(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader
          eyebrow={label}
          title={part?.title ?? (result.approved ? "Editorial QA Approved" : "Editorial QA Review")}
          statusLabel={result.approved ? "Approved" : "Needs revisions"}
        />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityMetricStrip
          items={[
            { label: "Findings", value: String(result.findings.length) },
          ]}
        />
        {result.findings.length > 0 ? (
          <ul className="flex flex-col gap-(--space-2)">
            {result.findings.slice(0, 5).map((finding) => (
              <li key={finding.id} className="ui-capability-context-item">
                <div className="flex flex-wrap items-center gap-(--space-2)">
                  <span className={`rounded-full px-(--space-2) py-[0.18rem] text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${severityTone(finding.severity)}`}>
                    {finding.severity}
                  </span>
                  <p className="text-sm font-medium text-foreground">{finding.issue}</p>
                </div>
                <p className="mt-(--space-2) text-sm text-foreground/72">{finding.recommendation}</p>
              </li>
            ))}
          </ul>
        ) : null}
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isResolveBlogArticleQaResultPayload(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title={result.title} statusLabel="Resolved draft" />
        <p className="ui-capability-card-summary">{result.resolutionSummary}</p>
        <CapabilityContextPanel
          items={createContextItems([{ label: "Description", value: result.description }])}
        />
        <CapabilityDisclosure label="Resolved draft preview">
          <p className="ui-capability-card-summary">{summarizeContent(result.content)}</p>
        </CapabilityDisclosure>
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isGenerateBlogImagePromptResultPayload(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title={part?.title ?? "Hero Image Prompt"} statusLabel="Prompt ready" />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Alt text", value: result.altText },
            { label: "Size", value: result.size },
            { label: "Quality", value: result.quality },
          ])}
        />
        <CapabilityDisclosure label="Prompt">
          <pre className="ui-capability-json-block">{result.prompt}</pre>
        </CapabilityDisclosure>
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isGenerateBlogImageResultPayload(result)) {
    const dimensions = result.width != null && result.height != null
      ? `${result.width} x ${result.height}`
      : null;

    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader
          eyebrow={label}
          title={detailValue(result.title ?? undefined) ?? part?.title ?? "Generated Hero Image"}
          statusLabel="Image ready"
        />
        <p className="ui-capability-card-summary">
          {result.summary ?? part?.summary ?? "Generated hero image asset is ready."}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/70">
          <img
            src={result.imageUrl}
            alt={part?.title ?? detailValue(result.title ?? undefined) ?? "Generated hero image"}
            className="h-auto w-full object-cover"
          />
        </div>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Asset", value: result.assetId },
            { label: "Article", value: result.postSlug ? `/journal/${result.postSlug}` : null },
            { label: "Selection", value: detailValue(result.selectionState) },
            { label: "Visibility", value: detailValue(result.visibility) },
            { label: "Dimensions", value: dimensions },
          ])}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (isProduceBlogArticleResultPayload(result)) {
    return (
      <CapabilityCardShell {...sharedShellProps}>
        <CapabilityCardHeader eyebrow={label} title={result.title} statusLabel="Draft pipeline ready" />
        <p className="ui-capability-card-summary">{result.summary}</p>
        <CapabilityContextPanel
          items={createContextItems([
            { label: "Status", value: "Draft" },
            { label: "Draft", value: `/journal/${result.slug}` },
            { label: "Hero asset", value: result.imageAssetId },
            { label: "Created", value: detailValue(result.createdAt) },
          ])}
        />
        <CapabilityTimeline
          title="Pipeline stages"
          items={result.stages.map((stage) => ({
            key: stage,
            label: formatStageLabel(stage),
            status: "succeeded" as const,
          }))}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  return <JobStatusFallbackCard {...props} />;
};
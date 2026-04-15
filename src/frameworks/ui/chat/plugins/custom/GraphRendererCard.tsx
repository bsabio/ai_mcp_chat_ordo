"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { ToolPluginProps } from "../../registry/types";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityArtifactRail } from "../../primitives/CapabilityArtifactRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { CapabilityMetricStrip } from "../../primitives/CapabilityMetricStrip";
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";
import { resolveGenerateGraphPayload, type ResolvedGraphPayload } from "@/core/use-cases/tools/graph-payload";

const GraphRenderer = dynamic(
  () => import("@/components/GraphRenderer").then((mod) => mod.GraphRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full flex items-center justify-center text-xs opacity-50 animate-pulse bg-surface-muted rounded-theme border-theme my-(--space-2)">
        Loading Graph Engine...
      </div>
    ),
  },
);

function isResolvedGraphPayload(value: unknown): value is ResolvedGraphPayload {
  return (
    typeof value === "object"
    && value !== null
    && "graph" in value
    && typeof (value as { graph?: unknown }).graph === "object"
    && (value as { graph: { kind?: unknown } }).graph !== null
    && typeof (value as { graph: { kind?: unknown } }).graph.kind === "string"
  );
}

export const GraphRendererCard: React.FC<ToolPluginProps> = (props) => {
  const { toolCall, resultEnvelope, part, computedActions = [], onActionClick } = props;
  if (!toolCall) return <JobStatusFallbackCard {...props} />;

  const label = resolveCapabilityDisplayLabel({
    toolName: toolCall.name,
    explicitLabel: part?.label,
    descriptorLabel: props.descriptor?.label,
    fallbackLabel: "Graph",
  });

  const payload = resultEnvelope?.payload ?? toolCall.result;
  let graph: ResolvedGraphPayload | null = null;
  try {
    graph = isResolvedGraphPayload(payload)
      ? payload
      : resolveGenerateGraphPayload(toolCall.args as Record<string, unknown>);
  } catch {
    // payload could not be resolved — render nothing
  }

  if (!graph) return <JobStatusFallbackCard {...props} />;

  const storedArtifacts = (resultEnvelope?.artifacts ?? []).flatMap((artifact) => {
    if (!artifact.uri && !artifact.assetId) {
      return [];
    }

    return [{
      id: artifact.assetId ?? artifact.uri,
      label: artifact.label,
      href: artifact.uri ?? (artifact.assetId ? `/api/user-files/${artifact.assetId}` : null),
      meta: artifact.mimeType,
    }];
  });

  return (
    <CapabilityCardShell
      descriptor={props.descriptor}
      state={part?.status ?? "succeeded"}
      ariaLabel={`${label} result`}
    >
      <CapabilityCardHeader eyebrow={label} statusLabel="Rendered" />
      <CapabilityMetricStrip
        items={[
          { label: "Kind", value: graph.graph.kind },
          { label: "Rows", value: String(graph.graph.data.length) },
        ]}
      />
      <CapabilityContextPanel
        items={[
          { label: "Title", value: graph.title ?? null },
          { label: "Caption", value: graph.caption ?? null },
          { label: "Summary", value: graph.summary ?? null },
          { label: "Source", value: graph.source?.label ?? null },
        ]}
      />
      <GraphRenderer
        graph={graph.graph}
        title={graph.title}
        caption={graph.caption}
        summary={graph.summary}
        downloadFileName={graph.downloadFileName}
        dataPreview={graph.dataPreview}
      />
      <CapabilityArtifactRail title="Stored asset" items={storedArtifacts} />
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
};

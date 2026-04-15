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
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";
import { resolveGenerateChartPayload } from "@/core/use-cases/tools/chart-payload";

const MermaidRenderer = dynamic(
  () =>
    import("@/components/MermaidRenderer").then(
      (mod) => mod.MermaidRenderer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-40 w-full flex items-center justify-center text-xs opacity-50 animate-pulse bg-surface-muted rounded-theme border-theme my-(--space-2)">
        Loading Diagram Engine...
      </div>
    ),
  },
);

export const ChartRendererCard: React.FC<ToolPluginProps> = (props) => {
  const { toolCall, resultEnvelope, part, computedActions = [], onActionClick } = props;
  if (!toolCall) return <JobStatusFallbackCard {...props} />;

  const label = resolveCapabilityDisplayLabel({
    toolName: toolCall.name,
    explicitLabel: part?.label,
    descriptorLabel: props.descriptor?.label,
    fallbackLabel: "Chart",
  });

  const payload = resultEnvelope?.payload ?? toolCall.result;
  let chart: ReturnType<typeof resolveGenerateChartPayload> | null = null;
  try {
    chart = resolveGenerateChartPayload(payload as Record<string, unknown>);
  } catch {
    try {
      chart = resolveGenerateChartPayload(toolCall.args as Record<string, unknown>);
    } catch {
      // payload could not be resolved — fall back to the generic status card
    }
  }

  if (!chart) return <JobStatusFallbackCard {...props} />;

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
      <CapabilityContextPanel
        items={[
          { label: "Title", value: chart.title ?? null },
          { label: "Caption", value: chart.caption ?? null },
          { label: "Download", value: chart.downloadFileName ?? null },
        ]}
      />
      <MermaidRenderer
        code={chart.code}
        title={chart.title}
        caption={chart.caption}
        downloadFileName={chart.downloadFileName}
      />
      <CapabilityArtifactRail title="Stored asset" items={storedArtifacts} />
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
};

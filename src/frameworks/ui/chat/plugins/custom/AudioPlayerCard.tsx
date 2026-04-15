"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { ToolPluginProps } from "../../registry/types";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { CapabilityMetricStrip } from "../../primitives/CapabilityMetricStrip";
import { JobStatusFallbackCard } from "../system/JobStatusFallbackCard";

const AudioPlayer = dynamic(
  () => import("@/components/AudioPlayer").then((mod) => mod.AudioPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="h-18 w-full max-w-sm flex items-center justify-center text-xs opacity-50 animate-pulse bg-surface-muted rounded-theme border-theme my-(--space-2)">
        Loading Audio Engine...
      </div>
    ),
  },
);

type GenerateAudioResultPayload = {
  action: "generate_audio";
  title: string;
  text: string;
  assetId: string | null;
  provider: string;
  generationStatus: "client_fetch_pending" | "cached_asset";
  estimatedDurationSeconds: number;
  estimatedGenerationSeconds: number;
};

function isGenerateAudioResultPayload(value: unknown): value is GenerateAudioResultPayload {
  return (
    typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === "generate_audio"
    && typeof (value as { text?: unknown }).text === "string"
    && typeof (value as { title?: unknown }).title === "string"
    && typeof (value as { provider?: unknown }).provider === "string"
    && typeof (value as { generationStatus?: unknown }).generationStatus === "string"
    && typeof (value as { estimatedDurationSeconds?: unknown }).estimatedDurationSeconds === "number"
    && typeof (value as { estimatedGenerationSeconds?: unknown }).estimatedGenerationSeconds === "number"
  );
}

export const AudioPlayerCard: React.FC<ToolPluginProps> = (props) => {
  const { toolCall, resultEnvelope, part, computedActions = [], onActionClick, isStreaming } = props;
  if (!toolCall) return <JobStatusFallbackCard {...props} />;

  const label = resolveCapabilityDisplayLabel({
    toolName: toolCall.name,
    explicitLabel: part?.label,
    descriptorLabel: props.descriptor?.label,
    fallbackLabel: "Audio",
  });

  const result = resultEnvelope?.payload ?? toolCall.result;

  const statusLabel = part?.status === "running"
    ? "Generating"
    : part?.status === "queued"
      ? "Queued"
      : part?.status === "failed"
        ? "Failed"
        : resultEnvelope?.summary.statusLine ?? "Ready";

  if (isGenerateAudioResultPayload(result)) {
    return (
      <CapabilityCardShell
        descriptor={props.descriptor}
        state={part?.status ?? "succeeded"}
        ariaLabel={`${label} result`}
      >
        <CapabilityCardHeader eyebrow={label} statusLabel={statusLabel} />
        <CapabilityMetricStrip
          items={[
            { label: "Duration", value: `${Math.round(result.estimatedDurationSeconds)}s` },
            { label: "Generation", value: `${Math.round(result.estimatedGenerationSeconds)}s` },
          ]}
        />
        <CapabilityContextPanel
          items={[
            { label: "Provider", value: result.provider },
            { label: "Generation status", value: result.generationStatus },
            { label: "Asset id", value: result.assetId ?? null },
          ]}
        />
        <AudioPlayer
          text={result.text}
          title={result.title}
          assetId={result.assetId ?? undefined}
          provider={result.provider}
          generationStatus={result.generationStatus}
          estimatedDurationSeconds={result.estimatedDurationSeconds}
          estimatedGenerationSeconds={result.estimatedGenerationSeconds}
          autoPlay={part ? false : isStreaming && !part}
        />
        <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
      </CapabilityCardShell>
    );
  }

  if (
    typeof toolCall.args.text !== "string"
    || toolCall.args.text.trim().length === 0
    || typeof toolCall.args.title !== "string"
    || toolCall.args.title.trim().length === 0
  ) {
    return <JobStatusFallbackCard {...props} />;
  }

  return (
    <CapabilityCardShell
      descriptor={props.descriptor}
      state={part?.status ?? "succeeded"}
      ariaLabel={`${label} result`}
    >
      <CapabilityCardHeader eyebrow={label} statusLabel={statusLabel} />
      <AudioPlayer
        text={toolCall.args.text}
        title={toolCall.args.title}
        assetId={typeof toolCall.args.assetId === "string" ? toolCall.args.assetId : undefined}
        autoPlay={part ? false : isStreaming && !part}
      />
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
};

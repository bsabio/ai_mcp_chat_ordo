import type { CapabilityResultEnvelope } from "@/core/entities/capability-result";
import type { ToolPluginProps } from "../../registry/types";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityArtifactRail } from "../../primitives/CapabilityArtifactRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { CapabilityTimeline } from "../../primitives/CapabilityTimeline";
import type { CapabilityTone } from "../../primitives/capability-card-tone";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { CapabilityDetailDrawer } from "./CapabilityDetailDrawer";
import {
  formatSystemStatus,
  hasInlineToolCallError,
  humanizeSystemToolName,
  summarizeSystemResult,
} from "./resolve-system-card";

const SYSTEM_JOB_TONE_MAP: Record<"queued" | "running" | "succeeded", CapabilityTone> = {
  queued: "neutral",
  running: "accent",
  succeeded: "success",
};

function resolveSystemJobTone(state: string): CapabilityTone {
  if (state === "running" || state === "queued" || state === "succeeded") {
    return SYSTEM_JOB_TONE_MAP[state];
  }

  return "neutral";
}

function hasObjectEntries(value: Record<string, unknown> | null | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function stringifySnapshot(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function buildArtifactItems(resultEnvelope: CapabilityResultEnvelope | null | undefined) {
  return (resultEnvelope?.artifacts ?? []).map((artifact, index) => ({
    id: artifact.assetId ?? artifact.uri ?? `${artifact.label}-${index}`,
    label: artifact.label,
    href: artifact.uri,
    meta: artifact.mimeType,
  }));
}

function resolveInlineToolCallState(toolCall: ToolPluginProps["toolCall"]): "running" | "failed" | "succeeded" {
  if (!toolCall || toolCall.result === undefined) {
    return "running";
  }

  if (hasInlineToolCallError(toolCall.result)) {
    return "failed";
  }

  return "succeeded";
}

export function SystemJobCard({
  part,
  toolCall,
  computedActions,
  descriptor,
  resultEnvelope,
  onActionClick,
}: ToolPluginProps) {
  const effectiveEnvelope = resultEnvelope ?? part?.resultEnvelope ?? null;
  const toolName = part?.toolName ?? toolCall?.name ?? "unknown_tool";
  const label = resolveCapabilityDisplayLabel({
    toolName,
    explicitLabel: part?.label,
    descriptorLabel: descriptor?.label,
    fallbackLabel: humanizeSystemToolName(toolName),
  });
  const state = part?.status ?? resolveInlineToolCallState(toolCall);
  const displayStatus = !part && state === "succeeded" ? "Completed" : formatSystemStatus(state);
  const summary =
    part?.error
    ?? part?.summary
    ?? effectiveEnvelope?.summary.message
    ?? summarizeSystemResult(effectiveEnvelope?.payload ?? toolCall?.result)
    ?? (!part && toolCall?.result === undefined ? "Waiting for tool result." : null);
  const titleCandidate = part?.title ?? effectiveEnvelope?.summary.title ?? null;
  const title = titleCandidate && titleCandidate !== label ? titleCandidate : null;
  const subtitle = part?.subtitle ?? effectiveEnvelope?.summary.subtitle ?? null;
  const terminalState = state === "failed" || state === "canceled";
  const progressPercent = terminalState ? null : part?.progressPercent ?? effectiveEnvelope?.progress?.percent ?? null;
  const progressLabel = terminalState ? null : part?.progressLabel ?? effectiveEnvelope?.progress?.label ?? null;
  const progressPhases = terminalState ? [] : effectiveEnvelope?.progress?.phases ?? [];
  const artifactItems = buildArtifactItems(effectiveEnvelope);
  const drawerSections = [
    hasObjectEntries(effectiveEnvelope?.inputSnapshot)
      ? {
          title: "Input snapshot",
          content: (
            <pre className="ui-capability-json-block">{stringifySnapshot(effectiveEnvelope?.inputSnapshot)}</pre>
          ),
        }
      : null,
    hasObjectEntries(effectiveEnvelope?.replaySnapshot ?? undefined)
      ? {
          title: "Replay snapshot",
          content: (
            <pre className="ui-capability-json-block">{stringifySnapshot(effectiveEnvelope?.replaySnapshot)}</pre>
          ),
        }
      : null,
    artifactItems.length > 0
      ? {
          title: "Artifacts",
          content: <CapabilityArtifactRail items={artifactItems} title="Artifacts" />,
        }
      : null,
  ].filter((section): section is NonNullable<typeof section> => section !== null);
  const contextItems = [
    part?.updatedAt ? { label: "Updated", value: part.updatedAt } : null,
    part?.replayedFromJobId ? { label: "Replayed from", value: part.replayedFromJobId } : null,
    part?.supersededByJobId ? { label: "Superseded by", value: part.supersededByJobId } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  return (
    <CapabilityCardShell
      descriptor={descriptor}
      tone={resolveSystemJobTone(state)}
      state={state}
      ariaLabel={`${label} status`}
    >
      <CapabilityCardHeader
        eyebrow={label}
        title={title}
        subtitle={subtitle}
        statusLabel={displayStatus}
        statusMeta={progressPercent != null ? `${Math.round(progressPercent)}%` : null}
      />

      {progressPercent != null ? (
        <div className="ui-capability-progress-track" data-capability-progress-track="true">
          <div
            className="ui-capability-progress-fill"
            style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
          />
        </div>
      ) : null}

      {progressLabel ? <p className="ui-capability-card-summary">{progressLabel}</p> : null}
      {summary ? <p className="ui-capability-card-summary">{summary}</p> : null}

      <CapabilityTimeline
        title="Progress"
        items={progressPhases.map((phase) => ({
          key: phase.key,
          label: phase.label,
          status: phase.status,
          meta: phase.percent != null ? `${Math.round(phase.percent)}%` : null,
        }))}
      />

      <CapabilityContextPanel items={contextItems} />
      <CapabilityArtifactRail items={artifactItems} />
      <CapabilityDetailDrawer
        title={title ?? label}
        subtitle={subtitle}
        summary={summary}
        sections={drawerSections}
      />
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
}

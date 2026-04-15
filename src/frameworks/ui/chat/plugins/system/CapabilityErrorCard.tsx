import type { ToolPluginProps } from "../../registry/types";
import { CapabilityActionRail } from "../../primitives/CapabilityActionRail";
import { CapabilityCardHeader } from "../../primitives/CapabilityCardHeader";
import { CapabilityCardShell } from "../../primitives/CapabilityCardShell";
import { CapabilityContextPanel } from "../../primitives/CapabilityContextPanel";
import { resolveCapabilityDisplayLabel } from "../../registry/capability-presentation-registry";
import { formatSystemStatus, humanizeSystemToolName, summarizeSystemResult } from "./resolve-system-card";

export function CapabilityErrorCard({
  part,
  toolCall,
  computedActions,
  descriptor,
  resultEnvelope,
  onActionClick,
}: ToolPluginProps) {
  const toolName = part?.toolName ?? toolCall?.name ?? "unknown_tool";
  const label = resolveCapabilityDisplayLabel({
    toolName,
    explicitLabel: part?.label,
    descriptorLabel: descriptor?.label,
    fallbackLabel: humanizeSystemToolName(toolName),
  });
  const status = part?.status === "canceled" ? "canceled" : "failed";
  const titleCandidate = part?.title ?? resultEnvelope?.summary.title ?? null;
  const title = titleCandidate && titleCandidate !== label ? titleCandidate : null;
  const subtitle = part?.subtitle ?? resultEnvelope?.summary.subtitle ?? null;
  const summary =
    part?.error
    ?? part?.summary
    ?? resultEnvelope?.summary.statusLine
    ?? resultEnvelope?.summary.message
    ?? summarizeSystemResult(resultEnvelope?.payload ?? toolCall?.result);
  const contextItems = [
    part?.failureClass ? { label: "Failure class", value: part.failureClass } : null,
    part?.recoveryMode ? { label: "Recovery", value: part.recoveryMode } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <CapabilityCardShell
      descriptor={descriptor}
      tone={status === "canceled" ? "warning" : "danger"}
      state={status}
      role="alert"
      ariaLabel={`${label} ${status}`}
      className="ui-capability-card--alert"
    >
      <CapabilityCardHeader
        eyebrow={label}
        title={title}
        subtitle={subtitle}
        statusLabel={formatSystemStatus(status)}
      />
      {summary ? <p className="ui-capability-card-summary">{summary}</p> : null}
      <CapabilityContextPanel items={contextItems} />
      <CapabilityActionRail actions={computedActions} onActionClick={onActionClick} />
    </CapabilityCardShell>
  );
}

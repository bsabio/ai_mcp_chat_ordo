import type { ReactNode } from "react";

import type { CapabilityProgressPhaseStatus } from "@/core/entities/capability-result";

export interface ProgressStripBubbleProps {
  label: string;
  status: CapabilityProgressPhaseStatus;
  value?: ReactNode;
  actionSlot?: ReactNode;
}

export function ProgressStripBubble({
  label,
  status,
  value,
  actionSlot,
}: ProgressStripBubbleProps) {
  return (
    <div data-capability-progress-bubble="true" data-capability-phase-status={status}>
      <span className="ui-capability-progress-bubble-dot" aria-hidden="true" />
      <div className="ui-capability-progress-bubble-copy">
        <span className="ui-capability-progress-bubble-label">{label}</span>
        {value ? <span className="ui-capability-progress-bubble-value">{value}</span> : null}
      </div>
      {actionSlot ? <div className="ui-capability-progress-bubble-action">{actionSlot}</div> : null}
    </div>
  );
}

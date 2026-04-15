import type { ReactNode } from "react";

export interface CapabilityCardHeaderProps {
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  statusLabel?: string | null;
  statusMeta?: string | null;
  trailing?: ReactNode;
}

export function CapabilityCardHeader({
  eyebrow,
  title,
  subtitle,
  statusLabel,
  statusMeta,
  trailing,
}: CapabilityCardHeaderProps) {
  if (!eyebrow && !title && !subtitle && !statusLabel && !statusMeta && !trailing) {
    return null;
  }

  return (
    <header className="ui-capability-card-header" data-capability-header="true">
      <div className="ui-capability-card-title-cluster" data-capability-title-cluster="true">
        {eyebrow ? (
          <p className="ui-capability-card-eyebrow" data-capability-eyebrow="true">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h3 className="ui-capability-card-title" data-capability-title="true">
            {title}
          </h3>
        ) : null}
        {subtitle ? (
          <p className="ui-capability-card-subtitle" data-capability-subtitle="true">
            {subtitle}
          </p>
        ) : null}
      </div>

      {statusLabel || statusMeta || trailing ? (
        <div className="ui-capability-card-status-cluster" data-capability-status-cluster="true">
          {statusLabel ? (
            <span className="ui-capability-card-status-label" data-capability-status-label="true">
              {statusLabel}
            </span>
          ) : null}
          {statusMeta ? (
            <span className="ui-capability-card-status-meta" data-capability-status-meta="true">
              {statusMeta}
            </span>
          ) : null}
          {trailing}
        </div>
      ) : null}
    </header>
  );
}

import type { CapabilityProgressPhaseStatus } from "@/core/entities/capability-result";

export interface CapabilityTimelineItem {
  key?: string;
  label: string;
  status?: CapabilityProgressPhaseStatus;
  meta?: string | null;
}

export interface CapabilityTimelineProps {
  title?: string;
  items: CapabilityTimelineItem[];
}

export function CapabilityTimeline({
  title = "Timeline",
  items,
}: CapabilityTimelineProps) {
  const visibleItems = items.filter((item) => item.label.trim().length > 0);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section data-capability-timeline="true">
      <p className="ui-capability-card-section-label">{title}</p>
      <ol className="ui-capability-timeline-list" data-capability-timeline-list="true">
        {visibleItems.map((item, index) => (
          <li
            key={item.key ?? `${item.label}-${index}`}
            className="ui-capability-timeline-item"
            data-capability-timeline-item="true"
            data-capability-phase-status={item.status ?? "pending"}
          >
            <span className="ui-capability-timeline-dot" aria-hidden="true" />
            <div className="ui-capability-timeline-copy">
              <span className="ui-capability-timeline-label">{item.label}</span>
              {item.meta ? <span className="ui-capability-timeline-meta">{item.meta}</span> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

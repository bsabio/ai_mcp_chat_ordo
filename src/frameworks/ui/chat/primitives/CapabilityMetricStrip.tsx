import type { ReactNode } from "react";

export interface CapabilityMetricItem {
  label: string;
  value: ReactNode;
}

export interface CapabilityMetricStripProps {
  items: CapabilityMetricItem[];
}

function isRenderableMetricValue(value: ReactNode): boolean {
  if (value == null || value === false) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

export function CapabilityMetricStrip({ items }: CapabilityMetricStripProps) {
  const visibleItems = items.filter((item) => isRenderableMetricValue(item.value));

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <dl className="ui-capability-metric-strip" data-capability-metric-strip="true">
      {visibleItems.map((item) => (
        <div key={item.label} className="ui-capability-metric" data-capability-metric="true">
          <dt className="ui-capability-metric-label">{item.label}</dt>
          <dd className="ui-capability-metric-value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

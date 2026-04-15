import React from "react";

import type { ReactNode } from "react";

export interface CapabilityContextItem {
  label: string;
  value: ReactNode;
}

export interface CapabilityContextPanelProps {
  items: CapabilityContextItem[];
}

function isRenderableContextValue(value: ReactNode): boolean {
  if (value == null || value === false) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return React.isValidElement(value) || typeof value === "number" || typeof value === "boolean";
}

export function CapabilityContextPanel({ items }: CapabilityContextPanelProps) {
  const visibleItems = items.filter((item) => isRenderableContextValue(item.value));

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <dl className="ui-capability-context-panel" data-capability-context-panel="true">
      {visibleItems.map((item) => (
        <div key={item.label} className="ui-capability-context-item" data-capability-context-item="true">
          <dt className="ui-capability-context-item-label">{item.label}</dt>
          <dd className="ui-capability-context-item-value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

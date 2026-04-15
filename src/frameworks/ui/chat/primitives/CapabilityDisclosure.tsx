"use client";

import { useId, useState } from "react";

import type { ReactNode } from "react";

export interface CapabilityDisclosureProps {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CapabilityDisclosure({
  label,
  children,
  defaultOpen = false,
}: CapabilityDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  if (!children) {
    return null;
  }

  return (
    <section data-capability-disclosure="true">
      <button
        type="button"
        className="ui-capability-disclosure-trigger focus-ring"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="ui-capability-disclosure-chevron"
          data-capability-disclosure-open={open}
        >
          {open ? "-" : "+"}
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="ui-capability-disclosure-panel"
        data-capability-disclosure-panel="true"
      >
        {open ? children : null}
      </div>
    </section>
  );
}

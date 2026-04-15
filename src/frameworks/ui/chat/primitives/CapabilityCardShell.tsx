import type { AriaRole, ReactNode } from "react";

import type { CapabilityPresentationDescriptor } from "@/core/entities/capability-presentation";

import {
  resolveCapabilityTone,
  type CapabilityCardState,
  type CapabilityTone,
} from "./capability-card-tone";

type DescriptorLike = Pick<CapabilityPresentationDescriptor, "family" | "cardKind">;

export interface CapabilityCardShellProps {
  children: ReactNode;
  descriptor?: DescriptorLike | null;
  tone?: CapabilityTone | null;
  state?: CapabilityCardState | null;
  cardKind?: string | null;
  role?: AriaRole;
  ariaLabel?: string;
  className?: string;
}

export function CapabilityCardShell({
  children,
  descriptor,
  tone,
  state = "idle",
  cardKind,
  role = "region",
  ariaLabel,
  className,
}: CapabilityCardShellProps) {
  const resolvedTone = resolveCapabilityTone({ tone, descriptor, state });
  const resolvedCardKind = cardKind ?? descriptor?.cardKind ?? "fallback";
  const classes = ["ui-capability-card", className].filter(Boolean).join(" ");

  return (
    <section
      role={role}
      aria-label={ariaLabel}
      className={classes}
      data-capability-card="true"
      data-capability-tone={resolvedTone}
      data-capability-kind={resolvedCardKind}
      data-capability-state={state}
    >
      {children}
    </section>
  );
}

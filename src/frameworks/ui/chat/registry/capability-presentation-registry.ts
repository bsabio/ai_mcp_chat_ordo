/**
 * Capability Presentation Registry
 *
 * Sprint 12: All entries are now derived from CAPABILITY_CATALOG via
 * projectPresentationDescriptor(). No manual createDescriptor() calls remain.
 *
 * The catalog is the single source of truth for presentation metadata
 * (family, cardKind, executionMode, progressMode, etc.).
 */
import type {
  CapabilityPresentationDescriptor,
} from "@/core/entities/capability-presentation";
import {
  CAPABILITY_CATALOG,
  projectPresentationDescriptor,
} from "@/core/capability-catalog/catalog";

// ---------------------------------------------------------------------------
// Build the descriptor map from catalog — every entry uses the catalog
// ---------------------------------------------------------------------------

const CHAT_CAPABILITY_PRESENTATION_DESCRIPTOR_MAP: Record<string, CapabilityPresentationDescriptor> = {};

for (const def of Object.values(CAPABILITY_CATALOG)) {
  CHAT_CAPABILITY_PRESENTATION_DESCRIPTOR_MAP[def.core.name] =
    projectPresentationDescriptor(def);
}

export const CHAT_CAPABILITY_PRESENTATION_TOOL_NAMES = Object.freeze(
  Object.keys(CHAT_CAPABILITY_PRESENTATION_DESCRIPTOR_MAP),
);

export function getCapabilityPresentationDescriptor(
  toolName: string,
): CapabilityPresentationDescriptor | undefined {
  return CHAT_CAPABILITY_PRESENTATION_DESCRIPTOR_MAP[toolName];
}

export function getCapabilityPresentationDescriptors(): CapabilityPresentationDescriptor[] {
  const seen = new Set<string>();

  return CHAT_CAPABILITY_PRESENTATION_TOOL_NAMES.flatMap((toolName) => {
    const descriptor = CHAT_CAPABILITY_PRESENTATION_DESCRIPTOR_MAP[toolName];
    if (seen.has(descriptor.toolName)) {
      return [];
    }

    seen.add(descriptor.toolName);
    return [descriptor];
  });
}

export function humanizeCapabilityToolName(toolName: string): string {
  return toolName
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function resolveCapabilityDisplayLabel(options: {
  toolName?: string | null;
  explicitLabel?: string | null;
  descriptorLabel?: string | null;
  fallbackLabel: string;
}): string {
  const explicitLabel = options.explicitLabel?.trim();
  if (explicitLabel) {
    return explicitLabel;
  }

  const descriptorLabel = options.descriptorLabel?.trim();
  if (descriptorLabel) {
    return descriptorLabel;
  }

  const toolName = options.toolName?.trim();
  if (toolName) {
    const descriptor = getCapabilityPresentationDescriptor(toolName);
    return descriptor?.label ?? humanizeCapabilityToolName(toolName);
  }

  return options.fallbackLabel;
}
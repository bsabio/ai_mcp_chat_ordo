/**
 * Browser Capability Registry
 *
 * Sprint 12: All browser runtime entries are derived from CAPABILITY_CATALOG
 * via projectBrowserCapability(). No manual descriptor objects remain.
 */
import type { BrowserCapabilityDescriptor } from "@/core/entities/browser-capability";
import {
  CAPABILITY_CATALOG,
  projectBrowserCapability,
} from "@/core/capability-catalog/catalog";

type CatalogBrowserRuntimeToolName = Extract<{
  [K in keyof typeof CAPABILITY_CATALOG]: (typeof CAPABILITY_CATALOG)[K] extends { browser: object } ? K : never;
}[keyof typeof CAPABILITY_CATALOG], string>;

export type BrowserRuntimeToolName = CatalogBrowserRuntimeToolName;

const BROWSER_CAPABILITY_ENTRIES = Object.entries(CAPABILITY_CATALOG).flatMap(([toolName, definition]) => {
  const projected = projectBrowserCapability(definition);
  return projected ? [[toolName as BrowserRuntimeToolName, projected] as const] : [];
});

const REGISTRY = Object.freeze(
  Object.fromEntries(BROWSER_CAPABILITY_ENTRIES) as Readonly<
    Record<BrowserRuntimeToolName, BrowserCapabilityDescriptor>
  >,
);

export const BROWSER_CAPABILITY_TOOL_NAMES = Object.freeze(
  BROWSER_CAPABILITY_ENTRIES.map(([toolName]) => toolName),
);

export function isBrowserCapabilityToolName(value: string): value is BrowserRuntimeToolName {
  return value in REGISTRY;
}

export function getBrowserCapabilityDescriptor(
  toolName: string,
): BrowserCapabilityDescriptor | null {
  return isBrowserCapabilityToolName(toolName)
    ? REGISTRY[toolName]
    : null;
}

export function listBrowserCapabilityDescriptors(): BrowserCapabilityDescriptor[] {
  return Object.values(REGISTRY);
}

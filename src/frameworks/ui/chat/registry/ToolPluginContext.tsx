"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CapabilityPresentationDescriptor } from "@/core/entities/capability-presentation";
import type { ToolComponent } from "./types";
import { JobStatusFallbackCard } from "../plugins/system/JobStatusFallbackCard";

export interface ToolPluginRegistry {
  getRenderer(toolName: string): ToolComponent;
  getDescriptor(toolName: string): CapabilityPresentationDescriptor | undefined;
}

const fallbackRegistry: ToolPluginRegistry = {
  getRenderer: () => JobStatusFallbackCard,
  getDescriptor: () => undefined,
};

const ToolPluginRegistryContext = createContext<ToolPluginRegistry>(fallbackRegistry);

export function ToolPluginRegistryProvider({
  registry,
  children,
}: {
  registry: ToolPluginRegistry;
  children: ReactNode;
}) {
  return (
    <ToolPluginRegistryContext.Provider value={registry}>
      {children}
    </ToolPluginRegistryContext.Provider>
  );
}

export function useToolPluginRegistry(): ToolPluginRegistry {
  return useContext(ToolPluginRegistryContext);
}

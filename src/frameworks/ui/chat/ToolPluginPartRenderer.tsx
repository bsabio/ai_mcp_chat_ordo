"use client";

import { createElement, useMemo } from "react";
import { projectCapabilityResultEnvelope } from "@/lib/capabilities/capability-result-envelope";
import { CapabilityErrorCard } from "./plugins/system/CapabilityErrorCard";
import { resolveSystemCardKind } from "./plugins/system/resolve-system-card";
import { useToolPluginRegistry } from "./registry/ToolPluginContext";
import type { ToolPluginProps } from "./registry/types";

/**
 * Wrapper component that resolves the correct plugin for a tool part or tool call.
 * Exists to keep the useToolPluginRegistry() call inside a component body,
 * not inside a .map() loop in AssistantBubble.
 */
export function ToolPluginPartRenderer(props: ToolPluginProps) {
  const {
    part,
    toolCall,
    descriptor: providedDescriptor,
    resultEnvelope: providedResultEnvelope,
    isStreaming,
    onActionClick,
    computedActions,
  } = props;
  const registry = useToolPluginRegistry();
  const toolName = toolCall?.name ?? part?.toolName ?? "";
  const descriptor = useMemo(
    () => providedDescriptor ?? registry.getDescriptor(toolName),
    [providedDescriptor, registry, toolName],
  );
  const resultEnvelope = useMemo(() => {
    if (providedResultEnvelope) {
      return providedResultEnvelope;
    }

    if (part?.resultEnvelope) {
      return part.resultEnvelope;
    }

    if (!toolName) {
      return null;
    }

    return projectCapabilityResultEnvelope({
      toolName,
      payload: toolCall?.result ?? part?.resultPayload ?? null,
      inputSnapshot: toolCall?.args,
      descriptor,
      executionMode: part
        ? (part.resultEnvelope?.executionMode ?? descriptor?.executionMode ?? "deferred")
        : descriptor?.executionMode,
      summary: part
        ? {
            title: part.title,
            subtitle: part.subtitle,
            statusLine: part.error,
            message: part.summary,
          }
        : undefined,
      progress:
        part && (part.progressPercent != null || part.progressLabel)
          ? {
              percent: part.progressPercent,
              label: part.progressLabel,
            }
          : undefined,
    });
  }, [descriptor, part, providedResultEnvelope, toolCall, toolName]);
  const effectiveToolCall = useMemo(() => {
    if (toolCall) {
      return {
        ...toolCall,
        result: resultEnvelope?.payload ?? toolCall.result,
      };
    }

    if (!part || (part.resultPayload == null && resultEnvelope?.payload == null)) {
      return undefined;
    }

    return {
      name: part.toolName,
      args: {},
      result: resultEnvelope?.payload ?? part.resultPayload,
    };
  }, [part, resultEnvelope, toolCall]);
  const Plugin = useMemo(
    () => registry.getRenderer(toolName),
    [registry, toolName],
  );
  const systemCardKind = useMemo(
    () => resolveSystemCardKind({ part, toolCall: effectiveToolCall, descriptor, resultEnvelope }),
    [descriptor, effectiveToolCall, part, resultEnvelope],
  );

  if (systemCardKind === "error") {
    return createElement(CapabilityErrorCard, {
      part,
      toolCall: effectiveToolCall,
      computedActions,
      descriptor,
      resultEnvelope,
      isStreaming,
      onActionClick,
    });
  }

  return createElement(Plugin, {
    part,
    toolCall: effectiveToolCall,
    computedActions,
    descriptor,
    resultEnvelope,
    isStreaming,
    onActionClick,
  });
}

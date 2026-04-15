import type { CapabilityPresentationDescriptor } from "@/core/entities/capability-presentation";
import type { CapabilityResultEnvelope } from "@/core/entities/capability-result";
import type { JobStatusMessagePart } from "@/core/entities/message-parts";
import { humanizeCapabilityToolName } from "../../registry/capability-presentation-registry";

import type { ToolCallData } from "../../registry/types";

export type SystemCardKind = "error" | null;

export interface ResolveSystemCardInput {
  part?: JobStatusMessagePart;
  toolCall?: ToolCallData;
  descriptor?: CapabilityPresentationDescriptor;
  resultEnvelope?: CapabilityResultEnvelope | null;
}

export function humanizeSystemToolName(toolName: string): string {
  return humanizeCapabilityToolName(toolName);
}

export function summarizeSystemResult(result: unknown): string | null {
  if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
    return String(result);
  }

  if (hasInlineToolCallError(result)) {
    return result.error;
  }

  if (typeof result === "object" && result !== null) {
    if ("message" in result && typeof (result as { message?: unknown }).message === "string") {
      return (result as { message: string }).message;
    }
  }

  return null;
}

export function formatSystemStatus(status: string): string {
  return status.replace(/^[a-z]/, (character) => character.toUpperCase());
}

export function hasInlineToolCallError(
  result: unknown,
): result is { error: string } & Record<string, unknown> {
  return (
    typeof result === "object"
    && result !== null
    && "error" in result
    && typeof (result as { error?: unknown }).error === "string"
    && (result as { error: string }).error.trim().length > 0
  );
}

export function resolveSystemCardKind(input: ResolveSystemCardInput): SystemCardKind {
  if (input.part && (input.part.status === "failed" || input.part.status === "canceled")) {
    return "error";
  }

  return null;
}

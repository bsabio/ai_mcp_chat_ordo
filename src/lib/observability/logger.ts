import { randomUUID } from "node:crypto";
import { emitObservabilityEvent, subscribeObservability } from "@/lib/observability/events";

export type LogLevel = "info" | "error";

let loggerObserverRegistered = false;

function ensureLoggerObserverRegistered() {
  if (loggerObserverRegistered) {
    return;
  }

  subscribeObservability((event) => {
    if (event.type !== "log") {
      return;
    }

    const output = JSON.stringify({
      timestamp: event.payload.timestamp,
      level: event.payload.level,
      event: event.payload.event,
      ...event.payload.context,
    });

    if (event.payload.level === "error") {
      console.error(output);
    } else {
      console.info(output);
    }
  });

  loggerObserverRegistered = true;
}

export function createRequestId(headers?: Headers): string {
  const existing = headers?.get("x-request-id")?.trim();
  return existing && existing.length > 0 ? existing : randomUUID();
}

export function logEvent(level: LogLevel, event: string, context: Record<string, unknown>) {
  ensureLoggerObserverRegistered();
  emitObservabilityEvent({
    type: "log",
    payload: {
      timestamp: new Date().toISOString(),
      level,
      event,
      context,
    },
  });
}

export function getErrorCode(message: string) {
  if (message === "messages must be a non-empty array." || message === "No user message found.") {
    return "VALIDATION_ERROR";
  }

  if (message.includes("provider")) {
    return "PROVIDER_ERROR";
  }

  return "INTERNAL_ERROR";
}

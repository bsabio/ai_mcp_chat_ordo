export type LogLevel = "info" | "error";

export type LogEventPayload = {
  timestamp: string;
  level: LogLevel;
  event: string;
  context: Record<string, unknown>;
};

export type RouteMetricPayload = {
  timestamp: string;
  route: string;
  durationMs: number;
  isError: boolean;
};

export type ObservabilityEvent =
  | { type: "log"; payload: LogEventPayload }
  | { type: "route-metric"; payload: RouteMetricPayload };

export type ObservabilityListener = (event: ObservabilityEvent) => void;

const listeners = new Set<ObservabilityListener>();

export function subscribeObservability(listener: ObservabilityListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitObservabilityEvent(event: ObservabilityEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

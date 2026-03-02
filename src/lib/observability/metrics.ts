import { emitObservabilityEvent, subscribeObservability } from "@/lib/observability/events";

let metricObserverRegistered = false;

function ensureMetricObserverRegistered() {
  if (metricObserverRegistered) {
    return;
  }

  subscribeObservability((event) => {
    if (event.type !== "route-metric") {
      return;
    }

    console.info(
      JSON.stringify({
        timestamp: event.payload.timestamp,
        level: "info",
        event: "metric.route",
        route: event.payload.route,
        durationMs: event.payload.durationMs,
        isError: event.payload.isError,
      }),
    );
  });

  metricObserverRegistered = true;
}

export function recordRouteMetric(route: string, durationMs: number, isError: boolean) {
  ensureMetricObserverRegistered();
  emitObservabilityEvent({
    type: "route-metric",
    payload: {
      timestamp: new Date().toISOString(),
      route,
      durationMs,
      isError,
    },
  });
}

export function getMetricsSnapshot() {
  return {
    mode: "externalized",
    details: "Route metrics are emitted as structured logs with event=metric.route.",
  };
}

export function resetMetrics() {
  // stateless by design; no process-local metric state to clear
}

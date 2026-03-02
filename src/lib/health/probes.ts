import { getAnthropicApiKey, getAnthropicModel } from "@/lib/config/env";

export type ProbeStatus = "ok" | "error";

export type ProbeResult = {
  status: ProbeStatus;
  checks: {
    config: ProbeStatus;
    model: ProbeStatus;
  };
  details?: string;
};

export function getLivenessProbe(): ProbeResult {
  return {
    status: "ok",
    checks: {
      config: "ok",
      model: "ok",
    },
  };
}

export function getReadinessProbe(): ProbeResult {
  try {
    getAnthropicApiKey();
    getAnthropicModel();

    return {
      status: "ok",
      checks: {
        config: "ok",
        model: "ok",
      },
    };
  } catch (error) {
    return {
      status: "error",
      checks: {
        config: "error",
        model: "error",
      },
      details: error instanceof Error ? error.message : "Readiness check failed.",
    };
  }
}

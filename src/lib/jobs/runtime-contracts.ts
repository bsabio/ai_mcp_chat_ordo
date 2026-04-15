import {
  JOB_CAPABILITY_TOOL_NAMES,
  type JobCapabilityName,
} from "@/lib/jobs/job-capability-registry";
import type { DeferredJobHandler } from "@/lib/jobs/deferred-job-worker";

function resolveNameDrift(expected: readonly string[], actual: readonly string[]) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  const missing = expected.filter((name) => !actualSet.has(name));
  const extra = actual.filter((name) => !expectedSet.has(name));

  return { missing, extra };
}

function formatNameDrift(label: string, expected: readonly string[], actual: readonly string[]): string | null {
  const { missing, extra } = resolveNameDrift(expected, actual);
  if (missing.length === 0 && extra.length === 0) {
    return null;
  }

  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`missing: ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    parts.push(`extra: ${extra.join(", ")}`);
  }

  return `${label} drifted from JOB_CAPABILITY_REGISTRY (${parts.join("; ")})`;
}

export function assertDeferredJobRuntimeContracts(
  handlers: Partial<Record<JobCapabilityName, DeferredJobHandler>>,
): void {
  const expectedNames = [...JOB_CAPABILITY_TOOL_NAMES];
  const handlerNames = Object.keys(handlers);

  const driftMessages = [
    formatNameDrift("createDeferredJobHandlers()", expectedNames, handlerNames),
  ].filter((message): message is string => message !== null);

  if (driftMessages.length === 0) {
    return;
  }

  throw new Error(
    `[deferred-jobs] startup validation failed: ${driftMessages.join(" | ")}`,
  );
}
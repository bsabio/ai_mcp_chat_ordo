import { describe, expect, it } from "vitest";

import { JOB_CAPABILITY_TOOL_NAMES } from "@/lib/jobs/job-capability-registry";
import { assertDeferredJobRuntimeContracts } from "@/lib/jobs/runtime-contracts";

function createAlignedHandlers() {
  return Object.fromEntries(
    JOB_CAPABILITY_TOOL_NAMES.map((name) => [name, async () => undefined]),
  );
}

describe("deferred job startup validation", () => {
  it("accepts aligned handler and capability names", () => {
    expect(() => assertDeferredJobRuntimeContracts(createAlignedHandlers())).not.toThrow();
  });

  it("fails closed when handler names drift from the canonical deferred-job contract", () => {
    const handlers = createAlignedHandlers();
    delete handlers.produce_blog_article;

    expect(() => assertDeferredJobRuntimeContracts(handlers)).toThrow(
      "createDeferredJobHandlers() drifted from JOB_CAPABILITY_REGISTRY",
    );
  });
});
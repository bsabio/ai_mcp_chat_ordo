import { getJobQueueRepository } from "@/adapters/RepositoryFactory";
import {
  createCatalogBoundDeferredJobHandler,
  buildDeferredJobHandlerDependencies,
  DEFERRED_JOB_HANDLER_FACTORIES,
  type DeferredJobHandlerFactory,
} from "@/lib/jobs/deferred-job-handler-factories";
import {
  JOB_CAPABILITY_TOOL_NAMES,
  type JobCapabilityName,
} from "@/lib/jobs/job-capability-registry";
import { assertDeferredJobRuntimeContracts } from "@/lib/jobs/runtime-contracts";
import type { DeferredJobHandler } from "@/lib/jobs/deferred-job-worker";

export function getDeferredJobRepository() {
  return getJobQueueRepository();
}

export function createDeferredJobHandlers(): Record<JobCapabilityName, DeferredJobHandler> {
  const dependencies = buildDeferredJobHandlerDependencies();
  const specialFactories: Partial<Record<JobCapabilityName, DeferredJobHandlerFactory>> = DEFERRED_JOB_HANDLER_FACTORIES;

  const handlers = Object.fromEntries(
    JOB_CAPABILITY_TOOL_NAMES.map((toolName) => {
      const specialFactory = specialFactories[toolName];
      return [
        toolName,
        specialFactory
          ? specialFactory(dependencies)
          : createCatalogBoundDeferredJobHandler(toolName, dependencies),
      ];
    }),
  ) as Record<JobCapabilityName, DeferredJobHandler>;

  assertDeferredJobRuntimeContracts(handlers);

  return handlers;
}
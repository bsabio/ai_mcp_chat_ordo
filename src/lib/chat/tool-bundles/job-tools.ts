import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { getJobStatusQuery } from "@/adapters/RepositoryFactory";
import {
  createGetDeferredJobStatusTool,
  createListDeferredJobsTool,
} from "@/core/use-cases/tools/deferred-job-status.tool";

export function registerJobTools(registry: ToolRegistry): void {
  const jobStatusQuery = getJobStatusQuery();
  registry.register(createGetDeferredJobStatusTool(jobStatusQuery));
  registry.register(createListDeferredJobsTool(jobStatusQuery));
}

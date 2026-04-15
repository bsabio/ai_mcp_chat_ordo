import type { ToolBundleDescriptor } from "@/core/tool-registry/ToolBundleDescriptor";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import type { JobStatusQuery } from "@/core/use-cases/JobStatusQuery";
import { getJobStatusQuery } from "@/adapters/RepositoryFactory";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface JobToolRegistrationDeps {
  readonly jobStatusQuery: JobStatusQuery;
}

const JOB_TOOL_REGISTRATIONS = [
  {
    toolName: "get_deferred_job_status",
    createTool: ({ jobStatusQuery }) =>
      projectCatalogBoundToolDescriptor("get_deferred_job_status", { jobStatusQuery }),
  },
  {
    toolName: "list_deferred_jobs",
    createTool: ({ jobStatusQuery }) =>
      projectCatalogBoundToolDescriptor("list_deferred_jobs", { jobStatusQuery }),
  },
] as const satisfies readonly ToolBundleRegistration<
  "get_deferred_job_status" | "list_deferred_jobs",
  JobToolRegistrationDeps
>[];

export const JOB_BUNDLE: ToolBundleDescriptor = createRegisteredToolBundle(
  "job",
  "Job Tools",
  JOB_TOOL_REGISTRATIONS,
);

export function registerJobTools(registry: ToolRegistry): void {
  registerToolBundle(registry, JOB_TOOL_REGISTRATIONS, {
    jobStatusQuery: getJobStatusQuery(),
  });
}

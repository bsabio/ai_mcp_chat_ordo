import type { ToolBundleDescriptor } from "@/core/tool-registry/ToolBundleDescriptor";
import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { projectCatalogBoundToolDescriptor } from "@/core/capability-catalog/runtime-tool-binding";
import type { JobStatusQuery } from "@/core/use-cases/JobStatusQuery";
import { getJobStatusQuery } from "@/adapters/RepositoryFactory";
import { createProfileService } from "@/lib/profile/profile-service";
import {
  createRegisteredToolBundle,
  registerToolBundle,
  type ToolBundleRegistration,
} from "./bundle-registration";

interface ProfileToolRegistrationDeps {
  readonly profileService: ReturnType<typeof createProfileService>;
  readonly jobStatusQuery: JobStatusQuery;
}

const PROFILE_TOOL_REGISTRATIONS = [
  {
    toolName: "get_my_profile",
    createTool: ({ profileService }) =>
      projectCatalogBoundToolDescriptor("get_my_profile", { profileService }),
  },
  {
    toolName: "update_my_profile",
    createTool: ({ profileService }) =>
      projectCatalogBoundToolDescriptor("update_my_profile", { profileService }),
  },
  {
    toolName: "get_my_referral_qr",
    createTool: ({ profileService }) =>
      projectCatalogBoundToolDescriptor("get_my_referral_qr", { profileService }),
  },
  {
    toolName: "get_my_job_status",
    createTool: ({ jobStatusQuery }) =>
      projectCatalogBoundToolDescriptor("get_my_job_status", { jobStatusQuery }),
  },
  {
    toolName: "list_my_jobs",
    createTool: ({ jobStatusQuery }) =>
      projectCatalogBoundToolDescriptor("list_my_jobs", { jobStatusQuery }),
  },
] as const satisfies readonly ToolBundleRegistration<
  | "get_my_profile"
  | "update_my_profile"
  | "get_my_referral_qr"
  | "get_my_job_status"
  | "list_my_jobs",
  ProfileToolRegistrationDeps
>[];

export const PROFILE_BUNDLE: ToolBundleDescriptor = createRegisteredToolBundle(
  "profile",
  "Profile Tools",
  PROFILE_TOOL_REGISTRATIONS,
);

export function registerProfileTools(registry: ToolRegistry): void {
  registerToolBundle(registry, PROFILE_TOOL_REGISTRATIONS, {
    profileService: createProfileService(),
    jobStatusQuery: getJobStatusQuery(),
  });
}

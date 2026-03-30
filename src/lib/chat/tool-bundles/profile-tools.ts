import type { ToolRegistry } from "@/core/tool-registry/ToolRegistry";
import { getJobStatusQuery } from "@/adapters/RepositoryFactory";
import { createProfileService } from "@/lib/profile/profile-service";
import {
  createGetMyProfileTool,
  createGetMyReferralQrTool,
  createUpdateMyProfileTool,
} from "@/core/use-cases/tools/user-profile.tool";
import {
  createGetMyJobStatusTool,
  createListMyJobsTool,
} from "@/core/use-cases/tools/deferred-job-status.tool";

export function registerProfileTools(registry: ToolRegistry): void {
  const profileService = createProfileService();
  const jobStatusQuery = getJobStatusQuery();
  registry.register(createGetMyProfileTool(profileService));
  registry.register(createUpdateMyProfileTool(profileService));
  registry.register(createGetMyReferralQrTool(profileService));
  registry.register(createGetMyJobStatusTool(jobStatusQuery));
  registry.register(createListMyJobsTool(jobStatusQuery));
}

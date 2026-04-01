import { getUserDataMapper } from "@/adapters/RepositoryFactory";
import type { RoleName } from "@/core/entities/user";
import type { ToolExecutionContext } from "@/core/tool-registry/ToolExecutionContext";

export interface AnalyticsViewerContext {
  role: RoleName;
  userId: string;
  affiliateEnabled: boolean;
}

export async function resolveAnalyticsViewerContext(
  context?: ToolExecutionContext,
): Promise<AnalyticsViewerContext> {
  if (!context || context.role === "ANONYMOUS") {
    return {
      role: "ANONYMOUS",
      userId: context?.userId ?? "anonymous",
      affiliateEnabled: false,
    };
  }

  const profile = await getUserDataMapper().findProfileById(context.userId);

  return {
    role: context.role,
    userId: context.userId,
    affiliateEnabled: Boolean(profile?.affiliateEnabled),
  };
}
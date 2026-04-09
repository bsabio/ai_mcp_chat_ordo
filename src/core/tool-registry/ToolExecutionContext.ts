import type { RoleName } from "@/core/entities/user";
import type { JobExecutionPrincipal } from "@/core/entities/job";
import type { CurrentPageSnapshot } from "@/lib/chat/current-page-context";
import type { Logger } from "@/core/services/ErrorHandler";

export interface ToolExecutionContext {
  role: RoleName;
  userId: string;
  executionPrincipal?: JobExecutionPrincipal;
  executionAllowedRoles?: readonly RoleName[];
  conversationId?: string;
  currentPathname?: string;
  currentPageSnapshot?: CurrentPageSnapshot;
  logger?: Logger;
}

import type { RoleName } from "@/core/entities/user";
import type { CurrentPageSnapshot } from "@/lib/chat/current-page-context";

export interface ToolExecutionContext {
  role: RoleName;
  userId: string;
  conversationId?: string;
  currentPathname?: string;
  currentPageSnapshot?: CurrentPageSnapshot;
}

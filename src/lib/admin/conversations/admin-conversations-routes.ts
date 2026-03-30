import { createAdminEntityRoutes } from "@/lib/admin/shared/admin-route-helpers";

export const conversationRoutes = createAdminEntityRoutes("/admin/conversations");

export function getAdminConversationsPath(): string {
  return conversationRoutes.list();
}

export function getAdminConversationDetailPath(id: string): string {
  return conversationRoutes.detail(id);
}

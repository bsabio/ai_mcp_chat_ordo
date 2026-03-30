import { createAdminEntityRoutes } from "@/lib/admin/shared/admin-route-helpers";

const promptRoutes = createAdminEntityRoutes("/admin/prompts");

export function getAdminPromptsPath(): string {
  return promptRoutes.list();
}

export function getAdminPromptDetailPath(role: string, promptType: string): string {
  return `/admin/prompts/${encodeURIComponent(role)}/${encodeURIComponent(promptType)}`;
}

import type { RoleName } from "@/core/entities/user";
import {
  type CurrentPageSnapshot,
} from "@/lib/chat/current-page-context";
import {
  createPromptAssemblyBuilder,
  type PromptAssemblyBuilder,
  type PromptSurface,
} from "@/lib/chat/prompt-runtime";

export interface SystemPromptOptions {
  surface?: PromptSurface;
  currentPathname?: string;
  currentPageSnapshot?: CurrentPageSnapshot;
}

export async function createSystemPromptBuilder(
  role: RoleName,
  options?: SystemPromptOptions,
): Promise<PromptAssemblyBuilder> {
  return createPromptAssemblyBuilder({
    surface: options?.surface ?? "direct_turn",
    role,
    currentPathname: options?.currentPathname,
    currentPageSnapshot: options?.currentPageSnapshot,
  });
}

export async function buildSystemPrompt(
  role: RoleName,
  options?: SystemPromptOptions,
): Promise<string> {
  const builder = await createSystemPromptBuilder(role, options);
  return await builder.build();
}

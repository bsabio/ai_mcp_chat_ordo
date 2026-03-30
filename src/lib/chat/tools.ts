import type Anthropic from "@anthropic-ai/sdk";
import type { RoleName } from "@/core/entities/user";
import { getToolComposition } from "@/lib/chat/tool-composition-root";

export { getToolComposition } from "@/lib/chat/tool-composition-root";

export function getToolsForRole(role: RoleName): Anthropic.Tool[] {
  return getToolComposition().registry.getSchemasForRole(role) as Anthropic.Tool[];
}


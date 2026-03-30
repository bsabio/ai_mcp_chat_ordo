import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { SystemPromptBuilder } from "@/core/use-cases/SystemPromptBuilder";
import { getDb } from "@/lib/db";
import type { RoleName } from "@/core/entities/user";
import { ConfigIdentitySource } from "@/adapters/ConfigIdentitySource";
import { SHELL_ROUTES } from "@/lib/shell/shell-navigation";

let _basePrompt: string | null = null;

function getBasePrompt(): string {
  if (!_basePrompt) {
    _basePrompt = new ConfigIdentitySource().getIdentity();
  }
  return _basePrompt;
}

/** Resolve a safe page-context string for the system prompt. */
function resolvePageContext(pathname: string): string {
  // Sanitize: only allow URL-safe pathname characters
  const safe = pathname.replace(/[^a-zA-Z0-9/_-]/g, "");
  const match = SHELL_ROUTES
    .filter((r) => r.kind === "internal" && (r.href === safe || safe.startsWith(r.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (match?.description) {
    return `[Current page: ${safe} — ${match.description}]`;
  }
  return `[Current page: ${safe}]`;
}

export interface SystemPromptOptions {
  currentPathname?: string;
}

export async function createSystemPromptBuilder(
  role: RoleName,
  options?: SystemPromptOptions,
): Promise<SystemPromptBuilder> {
  const db = getDb();
  const innerRepo = new SystemPromptDataMapper(db);
  const promptRepo = new DefaultingSystemPromptRepository(
    innerRepo,
    getBasePrompt(),
    ROLE_DIRECTIVES,
  );

  const base = await promptRepo.getActive("ALL", "base");
  const directive = await promptRepo.getActive(role, "role_directive");

  const builder = new SystemPromptBuilder()
    .withSection({ key: "identity", content: base?.content ?? "", priority: 10 })
    .withSection({ key: "role_directive", content: directive?.content ?? "", priority: 20 });

  if (options?.currentPathname) {
    builder.withSection({
      key: "page_context",
      content: resolvePageContext(options.currentPathname),
      priority: 25,
    });
  }

  return builder;
}

export async function buildSystemPrompt(
  role: RoleName,
  options?: SystemPromptOptions,
): Promise<string> {
  const builder = await createSystemPromptBuilder(role, options);
  return builder.build();
}

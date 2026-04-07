import { ROLE_DIRECTIVES } from "@/core/entities/role-directives";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { SystemPromptBuilder } from "@/core/use-cases/SystemPromptBuilder";
import { getDb } from "@/lib/db";
import type { RoleName } from "@/core/entities/user";
import { ConfigIdentitySource } from "@/adapters/ConfigIdentitySource";
import {
  formatCurrentPagePromptContext,
  resolveCurrentPageDetails,
  sanitizePathname,
  type CurrentPageSnapshot,
} from "@/lib/chat/current-page-context";

let _basePrompt: string | null = null;

function getBasePrompt(): string {
  if (!_basePrompt) {
    _basePrompt = new ConfigIdentitySource().getIdentity();
  }
  return _basePrompt;
}

export interface SystemPromptOptions {
  currentPathname?: string;
  currentPageSnapshot?: CurrentPageSnapshot;
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

  const authoritativePathname = options?.currentPathname
    ? sanitizePathname(options.currentPathname)
    : options?.currentPageSnapshot?.pathname;

  if (authoritativePathname) {
    builder.withSection({
      key: "page_context",
      content: formatCurrentPagePromptContext(
        resolveCurrentPageDetails(authoritativePathname, options?.currentPageSnapshot),
      ),
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

import type { UseCase } from "../common/UseCase";
import type { RoleName } from "../entities/user";
import type { SystemPromptRepository } from "./SystemPromptRepository";

export class ChatPolicyInteractor
  implements UseCase<{ role: RoleName }, string>
{
  constructor(private readonly promptRepo: SystemPromptRepository) {}

  async execute({ role }: { role: RoleName }): Promise<string> {
    const base = await this.promptRepo.getActive("ALL", "base");
    const directive = await this.promptRepo.getActive(role, "role_directive");
    return (base?.content ?? "") + (directive?.content ?? "");
  }
}

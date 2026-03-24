import type { IdentitySource } from "@/core/ports/IdentitySource";
import { buildCorpusBasePrompt } from "@/lib/corpus-vocabulary";

export class HardcodedIdentitySource implements IdentitySource {
  private readonly identity: string;

  constructor() {
    this.identity = buildCorpusBasePrompt();
  }

  getIdentity(): string {
    return this.identity;
  }
}

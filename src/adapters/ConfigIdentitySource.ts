import type { IdentitySource } from "@/core/ports/IdentitySource";
import { getInstanceIdentity, getInstancePrompts } from "@/lib/config/instance";
import { buildCorpusBasePrompt } from "@/lib/corpus-vocabulary";
import { DEFAULT_IDENTITY } from "@/lib/config/defaults";

/**
 * Implements the IdentitySource port using config files.
 * Constructs the system prompt identity string by:
 * 1. Starting with the corpus base prompt
 * 2. Replacing the hardcoded brand name if config differs from default
 * 3. Appending personality override from prompts.json if present
 * Falls back to the unmodified corpus base prompt when no config overrides exist.
 */
export class ConfigIdentitySource implements IdentitySource {
  getIdentity(): string {
    const identity = getInstanceIdentity();
    const prompts = getInstancePrompts();

    let prompt = buildCorpusBasePrompt();

    if (identity.name !== DEFAULT_IDENTITY.name) {
      prompt = prompt.replaceAll("Studio Ordo", identity.name);
    }

    if (prompts.personality) {
      prompt += "\n\n" + prompts.personality;
    }

    return prompt;
  }
}

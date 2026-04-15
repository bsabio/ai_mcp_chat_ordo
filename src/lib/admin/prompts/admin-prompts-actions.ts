/**
 * D4.3 — System Prompt admin actions.
 */

import { revalidatePath } from "next/cache";

import { readRequiredText, readOptionalText } from "@/lib/admin/shared/admin-form-parsers";
import { runAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import { createPromptControlPlaneService } from "@/lib/prompts/prompt-control-plane-service";
import type { PromptSlotType } from "@/core/use-cases/PromptControlPlaneService";

// ── Create new version ─────────────────────────────────────────────────

export async function createPromptVersionAction(formData: FormData) {
  "use server";

  return runAdminAction(formData, async (admin, formData) => {
    const role = readRequiredText(formData, "role");
    const promptType = readRequiredText(formData, "promptType");
    const content = readRequiredText(formData, "content");
    const notes = readOptionalText(formData, "notes") ?? "";

    const service = createPromptControlPlaneService({
      revalidatePaths: (paths) => {
        for (const path of paths) {
          revalidatePath(path);
        }
      },
    });

    await service.createVersion({
      role,
      promptType: promptType as PromptSlotType,
      content,
      createdBy: admin.id,
      notes,
    });
  });
}

// ── Activate a version ─────────────────────────────────────────────────

export async function activatePromptVersionAction(formData: FormData) {
  "use server";

  return runAdminAction(formData, async (_admin, formData) => {
    const role = readRequiredText(formData, "role");
    const promptType = readRequiredText(formData, "promptType");
    const versionStr = readRequiredText(formData, "version");
    const version = parseInt(versionStr, 10);
    if (Number.isNaN(version) || version < 1) {
      throw new Error(`Invalid version number: ${versionStr}`);
    }

    const service = createPromptControlPlaneService({
      revalidatePaths: (paths) => {
        for (const path of paths) {
          revalidatePath(path);
        }
      },
    });

    await service.activateVersion({ role, promptType: promptType as PromptSlotType, version });
  });
}

/**
 * D4.3 — System Prompt admin actions.
 */

import { revalidatePath } from "next/cache";

import { readRequiredText, readOptionalText } from "@/lib/admin/shared/admin-form-parsers";
import { withAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import { getSystemPromptDataMapper } from "@/adapters/RepositoryFactory";
import { getAdminPromptDetailPath } from "./admin-prompts-routes";

// ── Create new version ─────────────────────────────────────────────────

export const createPromptVersionAction = withAdminAction(async (admin, formData) => {
  const role = readRequiredText(formData, "role");
  const promptType = readRequiredText(formData, "promptType");
  const content = readRequiredText(formData, "content");
  const notes = readOptionalText(formData, "notes") ?? "";

  const mapper = getSystemPromptDataMapper();
  await mapper.createVersion({
    role,
    promptType,
    content,
    createdBy: admin.id,
    notes,
  });

  revalidatePath("/admin/prompts");
  revalidatePath(getAdminPromptDetailPath(role, promptType));
});

// ── Activate a version ─────────────────────────────────────────────────

export const activatePromptVersionAction = withAdminAction(async (_admin, formData) => {
  const role = readRequiredText(formData, "role");
  const promptType = readRequiredText(formData, "promptType");
  const versionStr = readRequiredText(formData, "version");
  const version = parseInt(versionStr, 10);
  if (Number.isNaN(version) || version < 1) {
    throw new Error(`Invalid version number: ${versionStr}`);
  }

  const mapper = getSystemPromptDataMapper();
  await mapper.activate(role, promptType, version);

  revalidatePath("/admin/prompts");
  revalidatePath(getAdminPromptDetailPath(role, promptType));
});

/**
 * D4.11 + D4.12 — Conversation admin actions.
 *
 * Takeover / hand-back + bulk archive.
 */

import { revalidatePath } from "next/cache";

import { readRequiredText } from "@/lib/admin/shared/admin-form-parsers";
import { withAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import {
  getConversationDataMapper,
  getMessageDataMapper,
} from "@/adapters/RepositoryFactory";

// ── Takeover ───────────────────────────────────────────────────────────

export const takeOverConversationAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");

  const convMapper = getConversationDataMapper();
  await convMapper.setConversationMode(id, "human");

  const msgMapper = getMessageDataMapper();
  await msgMapper.create({
    conversationId: id,
    role: "system",
    content: "The founder has joined the conversation.",
    parts: [],
  });

  revalidatePath("/admin/conversations");
  revalidatePath(`/admin/conversations/${id}`);
});

// ── Hand back ──────────────────────────────────────────────────────────

export const handBackConversationAction = withAdminAction(async (_admin, formData) => {
  const id = readRequiredText(formData, "id");

  const convMapper = getConversationDataMapper();
  await convMapper.setConversationMode(id, "ai");

  const msgMapper = getMessageDataMapper();
  await msgMapper.create({
    conversationId: id,
    role: "system",
    content: "The founder has left — the AI assistant will continue.",
    parts: [],
  });

  revalidatePath("/admin/conversations");
  revalidatePath(`/admin/conversations/${id}`);
});

// ── Bulk archive ───────────────────────────────────────────────────────

export const bulkArchiveConversationsAction = withAdminAction(async (_admin, formData) => {
  const idsRaw = readRequiredText(formData, "ids");
  const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error("No conversation IDs provided");
  }

  const convMapper = getConversationDataMapper();
  for (const id of ids) {
    await convMapper.archiveById(id);
  }

  revalidatePath("/admin/conversations");
});

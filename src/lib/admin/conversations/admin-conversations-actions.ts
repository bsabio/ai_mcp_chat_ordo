/**
 * D4.11 + D4.12 — Conversation admin actions.
 *
 * Takeover / hand-back + bulk archive.
 */

"use server";

import { revalidatePath } from "next/cache";

import { readRequiredText } from "@/lib/admin/shared/admin-form-parsers";
import { runAdminAction } from "@/lib/admin/shared/admin-action-helpers";
import {
  getConversationDataMapper,
  getMessageDataMapper,
} from "@/adapters/RepositoryFactory";
import { buildConversationExportPayload } from "@/lib/chat/conversation-portability";
import { buildTranscriptFromMessages } from "@/lib/chat/transcript-store";
import { getConversationEventRecorder, getConversationInteractor } from "@/lib/chat/conversation-root";

interface AdminConversationDownloadResult {
  fileName: string;
  mimeType: string;
  payload: string;
}

async function loadConversationExportContext(id: string) {
  const convMapper = getConversationDataMapper();
  const msgMapper = getMessageDataMapper();
  const conversation = await convMapper.findById(id);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const messages = await msgMapper.listByConversation(id);
  return { conversation, messages };
}

// ── Takeover ───────────────────────────────────────────────────────────

export async function takeOverConversationAction(formData: FormData) {
  return runAdminAction(formData, async (_admin, formData) => {
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
}

// ── Hand back ──────────────────────────────────────────────────────────

export async function handBackConversationAction(formData: FormData) {
  return runAdminAction(formData, async (_admin, formData) => {
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
}

// ── Bulk archive ───────────────────────────────────────────────────────

export async function bulkArchiveConversationsAction(formData: FormData) {
  return runAdminAction(formData, async (_admin, formData) => {
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
}

// ── Restore deleted ───────────────────────────────────────────────────

export async function restoreConversationAction(formData: FormData) {
  return runAdminAction(formData, async (admin, formData) => {
    const id = readRequiredText(formData, "id");

    const convMapper = getConversationDataMapper();
    await convMapper.restoreDeleted(id, admin.id);

    revalidatePath("/admin/conversations");
    revalidatePath(`/admin/conversations/${id}`);
  });
}

// ── Export ────────────────────────────────────────────────────────────

export async function exportConversationAction(formData: FormData) {
  return runAdminAction(formData, async (admin, formData) => {
    const id = readRequiredText(formData, "id");

    const { conversation, messages } = await loadConversationExportContext(id);
    const payload = buildConversationExportPayload({ conversation, messages });

    await getConversationEventRecorder().record(id, "exported", {
      exported_by: admin.id,
      scope: "admin",
      exported_at: payload.exportedAt,
    });

    revalidatePath(`/admin/conversations/${id}`);

    const result: AdminConversationDownloadResult = {
      fileName: `conversation-${id}.json`,
      mimeType: "application/json",
      payload: `${JSON.stringify(payload, null, 2)}\n`,
    };

    return result;
  });
}

export async function exportConversationTranscriptAction(formData: FormData) {
  return runAdminAction(formData, async (admin, formData) => {
    const id = readRequiredText(formData, "id");

    const { conversation, messages } = await loadConversationExportContext(id);
    const exportedAt = new Date().toISOString();
    const transcript = buildTranscriptFromMessages(messages);
    const payload = {
      version: 1,
      exportedAt,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        status: conversation.status,
        messageCount: conversation.messageCount,
        updatedAt: conversation.updatedAt,
      },
      transcriptSummary: {
        entryCount: transcript.length,
        inContextCount: transcript.filter((entry) => entry.inContextWindow).length,
        toolResultCount: transcript.filter((entry) => entry.role === "tool_result").length,
        compactionMarkerCount: transcript.filter((entry) => entry.role === "compaction_marker").length,
      },
      transcript,
    };

    await getConversationEventRecorder().record(id, "exported", {
      exported_by: admin.id,
      scope: "admin_transcript",
      exported_at: exportedAt,
      transcript_entries: transcript.length,
    });

    revalidatePath(`/admin/conversations/${id}`);

    const result: AdminConversationDownloadResult = {
      fileName: `conversation-${id}-transcript.json`,
      mimeType: "application/json",
      payload: `${JSON.stringify(payload, null, 2)}\n`,
    };

    return result;
  });
}

// ── Governed purge ───────────────────────────────────────────────────

export async function purgeConversationAction(formData: FormData) {
  return runAdminAction(formData, async (admin, formData) => {
    const id = readRequiredText(formData, "id");
    const reason = readRequiredText(formData, "reason");

    const interactor = getConversationInteractor();
    await interactor.purge(id, {
      userId: admin.id,
      role: "ADMIN",
      reason: reason === "privacy_request" || reason === "retention_policy"
        ? reason
        : "admin_removed",
    });

    revalidatePath("/admin/conversations");
    revalidatePath(`/admin/conversations/${id}`);
  });
}

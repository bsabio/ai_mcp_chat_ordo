import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminPageAccessMock,
  revalidatePathMock,
  convFindByIdMock,
  msgListByConversationMock,
  eventRecordMock,
  purgeMock,
} = vi.hoisted(() => ({
  requireAdminPageAccessMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  convFindByIdMock: vi.fn(),
  msgListByConversationMock: vi.fn(),
  eventRecordMock: vi.fn(),
  purgeMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/journal/admin-journal", () => ({
  requireAdminPageAccess: requireAdminPageAccessMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getConversationDataMapper: () => ({
    findById: convFindByIdMock,
  }),
  getMessageDataMapper: () => ({
    listByConversation: msgListByConversationMock,
  }),
}));

vi.mock("@/lib/chat/conversation-root", () => ({
  getConversationEventRecorder: () => ({ record: eventRecordMock }),
  getConversationInteractor: () => ({ purge: purgeMock }),
}));

import {
  exportConversationAction,
  purgeConversationAction,
} from "./admin-conversations-actions";

function makeFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("admin conversation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminPageAccessMock.mockResolvedValue({ id: "admin_1", roles: ["ADMIN"] });
    eventRecordMock.mockResolvedValue(undefined);
    purgeMock.mockResolvedValue(undefined);
  });

  it("returns a downloadable platform export payload for admins", async () => {
    convFindByIdMock.mockResolvedValue({
      id: "conv_1",
      userId: "usr_1",
      title: "Imported ops review",
      status: "archived",
      createdAt: "2026-04-08T10:00:00.000Z",
      updatedAt: "2026-04-08T11:00:00.000Z",
      convertedFrom: null,
      messageCount: 1,
      firstMessageAt: null,
      lastToolUsed: null,
      sessionSource: "authenticated",
      promptVersion: null,
      routingSnapshot: { lane: "organization", confidence: 0.9 },
      referralSource: null,
    });
    msgListByConversationMock.mockResolvedValue([
      {
        id: "msg_1",
        conversationId: "conv_1",
        role: "user",
        content: "Please export this thread.",
        parts: [{ type: "text", text: "Please export this thread." }],
        createdAt: "2026-04-08T10:05:00.000Z",
        tokenEstimate: 6,
      },
    ]);

    const result = await exportConversationAction(makeFormData({ id: "conv_1" }));

    expect(result.fileName).toBe("conversation-conv_1.json");
    expect(result.payload).toContain('"version": 1');
    expect(eventRecordMock).toHaveBeenCalledWith(
      "conv_1",
      "exported",
      expect.objectContaining({ exported_by: "admin_1", scope: "admin" }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/conversations/conv_1");
  });

  it("delegates governed purge to the conversation interactor with admin actor metadata", async () => {
    await purgeConversationAction(makeFormData({ id: "conv_1", reason: "admin_removed" }));

    expect(purgeMock).toHaveBeenCalledWith(
      "conv_1",
      expect.objectContaining({
        userId: "admin_1",
        role: "ADMIN",
        reason: "admin_removed",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/conversations");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/conversations/conv_1");
  });
});
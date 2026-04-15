import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/core/entities/chat-message";
import type { RoleName } from "@/core/entities/user";
import type { ChatAction } from "@/hooks/chat/chatState";
import type { InstancePrompts } from "@/lib/config/defaults";
import { useBootstrapMessages } from "./useBootstrapMessages";

const shouldRefreshMock = vi.fn();
const createInitialMock = vi.fn();

vi.mock("@/hooks/chat/chatBootstrap", () => ({
  shouldRefreshBootstrapMessages: (...args: unknown[]) => shouldRefreshMock(...args),
}));

vi.mock("@/hooks/chat/chatState", () => ({
  createInitialChatMessages: (...args: unknown[]) => createInitialMock(...args),
}));

function makeBootstrapMessage(): ChatMessage {
  return {
    id: "bootstrap_1",
    role: "assistant",
    content: "Welcome",
    timestamp: new Date(),
  };
}

const TEST_PROMPTS: InstancePrompts = {
  firstMessage: {
    default: "Hi",
  },
  defaultSuggestions: [],
  roleBootstraps: {
    AUTHENTICATED: { message: "Welcome back", suggestions: [] },
    ADMIN: { message: "Operator ready", suggestions: [] },
    STAFF: { message: "Staff ready", suggestions: [] },
    APPRENTICE: { message: "Apprentice ready", suggestions: [] },
  },
};

function makeBaseOptions(dispatch: (action: ChatAction) => void) {
  return {
    messages: [makeBootstrapMessage()],
    initialRole: "ANONYMOUS" as RoleName,
    conversationId: null,
    currentConversation: null,
    isLoadingMessages: false,
    isSending: false,
    prompts: TEST_PROMPTS,
    referralCtx: undefined,
    dispatch,
  };
}

describe("useBootstrapMessages", () => {
  beforeEach(() => {
    shouldRefreshMock.mockReset();
    createInitialMock.mockReset();
    createInitialMock.mockReturnValue([makeBootstrapMessage()]);
  });

  it("dispatches REPLACE_ALL when shouldRefreshBootstrapMessages returns true", () => {
    shouldRefreshMock.mockReturnValue(true);
    const dispatch = vi.fn<(action: ChatAction) => void>();
    const options = makeBaseOptions(dispatch);

    renderHook(() => useBootstrapMessages(options));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REPLACE_ALL" }),
    );
    expect(createInitialMock).toHaveBeenCalledWith(
      "ANONYMOUS",
      options.prompts,
      undefined,
    );
  });

  it("does not dispatch when shouldRefreshBootstrapMessages returns false", () => {
    shouldRefreshMock.mockReturnValue(false);
    const dispatch = vi.fn<(action: ChatAction) => void>();

    renderHook(() => useBootstrapMessages(makeBaseOptions(dispatch)));

    expect(dispatch).not.toHaveBeenCalled();
  });

  it("passes referralCtx to createInitialChatMessages", () => {
    shouldRefreshMock.mockReturnValue(true);
    const dispatch = vi.fn<(action: ChatAction) => void>();
    const options = {
      ...makeBaseOptions(dispatch),
      referralCtx: { referrerName: "Dr. Smith", referrerCredential: "MD" },
    };

    renderHook(() => useBootstrapMessages(options));

    expect(createInitialMock).toHaveBeenCalledWith(
      "ANONYMOUS",
      options.prompts,
      { referrerName: "Dr. Smith", referrerCredential: "MD" },
    );
  });

  it("updates bootstrapRoleRef so it does not re-dispatch on next render", () => {
    shouldRefreshMock
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    const dispatch = vi.fn<(action: ChatAction) => void>();
    const options = makeBaseOptions(dispatch);

    const { rerender } = renderHook(() => useBootstrapMessages(options));

    expect(dispatch).toHaveBeenCalledTimes(1);

    rerender();

    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

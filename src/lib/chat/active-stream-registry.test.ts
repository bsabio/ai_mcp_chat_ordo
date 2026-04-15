import { describe, expect, it } from "vitest";

import {
  ActiveStreamConflictError,
  clearActiveStreamsForTests,
  getActiveStreamSnapshot,
  getActiveStreamSnapshotForOwnerConversation,
  registerActiveStream,
  stopActiveStream,
} from "@/lib/chat/active-stream-registry";

describe("activeStreamRegistry", () => {
  it("registers a stream and returns an inspectable snapshot", () => {
    clearActiveStreamsForTests();

    const registration = registerActiveStream({
      streamId: "stream_test_1",
      ownerUserId: "usr_owner",
      conversationId: "conv_1",
      abortController: new AbortController(),
    });

    expect(registration.streamId).toBe("stream_test_1");
    expect(getActiveStreamSnapshot("stream_test_1")).toMatchObject({
      streamId: "stream_test_1",
      ownerUserId: "usr_owner",
      conversationId: "conv_1",
    });

    registration.unregister();
    expect(getActiveStreamSnapshot("stream_test_1")).toBeNull();
  });

  it("aborts and removes a stream when the owner stops it", () => {
    clearActiveStreamsForTests();

    const abortController = new AbortController();
    registerActiveStream({
      streamId: "stream_test_2",
      ownerUserId: "usr_owner",
      conversationId: "conv_2",
      abortController,
    });

    const stopped = stopActiveStream("stream_test_2", "usr_owner");

    expect(stopped).toMatchObject({
      streamId: "stream_test_2",
      conversationId: "conv_2",
    });
    expect(abortController.signal.aborted).toBe(true);
    expect(getActiveStreamSnapshot("stream_test_2")).toBeNull();
  });

  it("returns the active stream snapshot for an owner and conversation pair", () => {
    clearActiveStreamsForTests();

    registerActiveStream({
      streamId: "stream_test_lookup",
      ownerUserId: "usr_owner",
      conversationId: "conv_lookup",
      abortController: new AbortController(),
    });

    expect(getActiveStreamSnapshotForOwnerConversation("usr_owner", "conv_lookup")).toMatchObject({
      streamId: "stream_test_lookup",
      ownerUserId: "usr_owner",
      conversationId: "conv_lookup",
    });
  });

  it("rejects duplicate streams for the same owner and conversation", () => {
    clearActiveStreamsForTests();

    registerActiveStream({
      streamId: "stream_test_primary",
      ownerUserId: "usr_owner",
      conversationId: "conv_dup",
      abortController: new AbortController(),
    });

    expect(() => registerActiveStream({
      streamId: "stream_test_secondary",
      ownerUserId: "usr_owner",
      conversationId: "conv_dup",
      abortController: new AbortController(),
    })).toThrowError(ActiveStreamConflictError);
  });

  it("does not stop a stream for a different owner", () => {
    clearActiveStreamsForTests();

    const abortController = new AbortController();
    registerActiveStream({
      streamId: "stream_test_3",
      ownerUserId: "usr_owner",
      conversationId: "conv_3",
      abortController,
    });

    expect(stopActiveStream("stream_test_3", "usr_other")).toBeNull();
    expect(abortController.signal.aborted).toBe(false);
    expect(getActiveStreamSnapshot("stream_test_3")).toMatchObject({
      streamId: "stream_test_3",
      ownerUserId: "usr_owner",
    });
  });
});
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearActiveStreamsForTests,
  getActiveStreamSnapshot,
  registerActiveStream,
} from "@/lib/chat/active-stream-registry";
import { createRouteRequest } from "../../../../../../../tests/helpers/workflow-route-fixture";

const { resolveUserIdMock } = vi.hoisted(() => ({
  resolveUserIdMock: vi.fn(),
}));

vi.mock("@/lib/chat/resolve-user", () => ({
  resolveUserId: resolveUserIdMock,
}));

import { POST } from "@/app/api/chat/streams/[streamId]/stop/route";

describe("POST /api/chat/streams/[streamId]/stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearActiveStreamsForTests();
    resolveUserIdMock.mockResolvedValue({ userId: "usr_owner", isAnonymous: false });
  });

  afterEach(() => {
    clearActiveStreamsForTests();
  });

  it("stops an active stream for its owner", async () => {
    const abortController = new AbortController();
    registerActiveStream({
      streamId: "stream_stop_1",
      ownerUserId: "usr_owner",
      conversationId: "conv_stop_1",
      abortController,
    });

    const response = await POST(createRouteRequest("/api/chat/streams/stream_stop_1/stop", "POST"), {
      params: Promise.resolve({ streamId: "stream_stop_1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      stopped: true,
      streamId: "stream_stop_1",
      conversationId: "conv_stop_1",
    });
    expect(abortController.signal.aborted).toBe(true);
    expect(getActiveStreamSnapshot("stream_stop_1")).toBeNull();
  });

  it("returns 404 when another user attempts to stop the stream", async () => {
    const abortController = new AbortController();
    registerActiveStream({
      streamId: "stream_stop_2",
      ownerUserId: "usr_owner",
      conversationId: "conv_stop_2",
      abortController,
    });
    resolveUserIdMock.mockResolvedValue({ userId: "usr_other", isAnonymous: false });

    const response = await POST(createRouteRequest("/api/chat/streams/stream_stop_2/stop", "POST"), {
      params: Promise.resolve({ streamId: "stream_stop_2" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Active stream not found");
    expect(abortController.signal.aborted).toBe(false);
    expect(getActiveStreamSnapshot("stream_stop_2")).toMatchObject({
      streamId: "stream_stop_2",
      ownerUserId: "usr_owner",
    });
  });

  it("returns 404 when the stream no longer exists", async () => {
    const response = await POST(createRouteRequest("/api/chat/streams/stream_missing/stop", "POST"), {
      params: Promise.resolve({ streamId: "stream_missing" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.error).toBe("Active stream not found");
  });
});
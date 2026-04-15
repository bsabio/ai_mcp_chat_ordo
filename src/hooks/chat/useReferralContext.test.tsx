import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatAction } from "@/hooks/chat/chatState";
import { useReferralContext } from "./useReferralContext";
import { DEFAULT_PROMPTS } from "@/lib/config/defaults";

const fetchMock = vi.fn();
const prompts = DEFAULT_PROMPTS;

describe("useReferralContext", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("fetches referral context for ANONYMOUS role", async () => {
    const dispatch = vi.fn<(action: ChatAction) => void>();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ referrer: { name: "Dr. Smith", credential: "MD" } }),
    });

    const { result } = renderHook(() =>
      useReferralContext("ANONYMOUS", prompts, dispatch),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        referrerName: "Dr. Smith",
        referrerCredential: "MD",
      });
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REPLACE_ALL" }),
    );
  });

  it("does not fetch for non-ANONYMOUS roles", () => {
    const dispatch = vi.fn<(action: ChatAction) => void>();

    renderHook(() =>
      useReferralContext("AUTHENTICATED", prompts, dispatch),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns undefined when referral visit has no referrer", async () => {
    const dispatch = vi.fn<(action: ChatAction) => void>();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ referrer: null }),
    });

    const { result } = renderHook(() =>
      useReferralContext("ANONYMOUS", prompts, dispatch),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/referral/visit");
    });

    expect(result.current).toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns undefined on fetch failure", async () => {
    const dispatch = vi.fn<(action: ChatAction) => void>();
    fetchMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() =>
      useReferralContext("ANONYMOUS", prompts, dispatch),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(result.current).toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("only fetches once even across re-renders", async () => {
    const dispatch = vi.fn<(action: ChatAction) => void>();
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { rerender } = renderHook(() =>
      useReferralContext("ANONYMOUS", prompts, dispatch),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    rerender();
    rerender();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

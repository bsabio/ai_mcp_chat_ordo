import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import BlogIndexPage from "@/app/blog/page";

describe("/app/blog/page route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects the legacy /blog index to canonical /journal", async () => {
    await expect(BlogIndexPage()).rejects.toThrow("redirect:/journal");
    expect(redirectMock).toHaveBeenCalledWith("/journal");
  });
});
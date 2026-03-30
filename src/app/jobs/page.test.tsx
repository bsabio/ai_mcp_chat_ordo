import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import JobsPage from "@/app/jobs/page";

describe("/jobs page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /admin/jobs", () => {
    expect(() => JobsPage()).toThrow("redirect:/admin/jobs");
    expect(redirectMock).toHaveBeenCalledWith("/admin/jobs");
  });
});
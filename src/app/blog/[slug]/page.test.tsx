import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findBySlugMock,
  notFoundMock,
  redirectMock,
} = vi.hoisted(() => ({
  findBySlugMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("notFound");
  }),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository: () => ({
    findBySlug: findBySlugMock,
  }),
}));

import BlogPostPage from "@/app/blog/[slug]/page";

describe("/app/blog/[slug] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects published legacy /blog articles to canonical /journal/[slug]", async () => {
    findBySlugMock.mockResolvedValue({
      id: "post_1",
      slug: "launch-plan",
      title: "Launch Plan",
      description: "Operational release notes.",
      content: "## Launch\n\nPlan body.",
      standfirst: null,
      heroImageAssetId: null,
      section: "briefing",
      status: "published",
      publishedAt: "2026-03-26T00:00:00.000Z",
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
      createdByUserId: "usr_admin",
      publishedByUserId: "usr_admin",
    });

    await expect(BlogPostPage({ params: Promise.resolve({ slug: "launch-plan" }) })).rejects.toThrow("redirect:/journal/launch-plan");
    expect(redirectMock).toHaveBeenCalledWith("/journal/launch-plan");
  });

  it("fails closed for missing or unpublished posts on the current blog route", async () => {
    findBySlugMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "post_2",
      slug: "draft-post",
      title: "Draft Post",
      description: "Not public.",
      content: "## Draft\n\nHidden.",
      standfirst: null,
      heroImageAssetId: null,
      section: "essay",
      status: "draft",
      publishedAt: null,
      createdAt: "2026-03-25T00:00:00.000Z",
      updatedAt: "2026-03-25T00:00:00.000Z",
      createdByUserId: "usr_admin",
      publishedByUserId: null,
    });

    await expect(BlogPostPage({ params: Promise.resolve({ slug: "missing" }) })).rejects.toThrow("notFound");
    await expect(BlogPostPage({ params: Promise.resolve({ slug: "draft-post" }) })).rejects.toThrow("notFound");
    expect(notFoundMock).toHaveBeenCalledTimes(2);
  });

});
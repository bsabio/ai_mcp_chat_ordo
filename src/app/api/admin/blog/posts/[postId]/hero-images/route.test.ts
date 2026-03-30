import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAdminSessionUser,
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  getBlogPostRepositoryMock,
  getBlogAssetRepositoryMock,
  listHeroCandidatesMock,
  findByIdMock,
  selectHeroImageMock,
  rejectHeroImageMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getBlogPostRepositoryMock: vi.fn(),
  getBlogAssetRepositoryMock: vi.fn(),
  listHeroCandidatesMock: vi.fn(),
  findByIdMock: vi.fn(),
  selectHeroImageMock: vi.fn(),
  rejectHeroImageMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository: getBlogPostRepositoryMock,
  getBlogAssetRepository: getBlogAssetRepositoryMock,
}));

vi.mock("@/lib/blog/blog-production-root", () => ({
  getBlogImageGenerationService: () => ({
    selectHeroImage: selectHeroImageMock,
    rejectHeroImage: rejectHeroImageMock,
  }),
}));

import { GET, PATCH } from "./route";

function createParams(postId: string) {
  return { params: Promise.resolve({ postId }) };
}

describe("/api/admin/blog/posts/[postId]/hero-images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    getBlogPostRepositoryMock.mockReturnValue({ findById: findByIdMock });
    getBlogAssetRepositoryMock.mockReturnValue({
      listHeroCandidates: listHeroCandidatesMock,
      findById: vi.fn(),
    });
    findByIdMock.mockResolvedValue({
      id: "post_1",
      slug: "ai-governance-playbook",
      title: "AI Governance Playbook",
      status: "draft",
      heroImageAssetId: "asset_selected",
    });
    listHeroCandidatesMock.mockResolvedValue([
      {
        id: "asset_selected",
        postId: "post_1",
        kind: "hero",
        storagePath: "2026/post/selected.png",
        mimeType: "image/png",
        width: 1536,
        height: 1024,
        altText: "Selected image",
        sourcePrompt: "Prompt A",
        provider: "openai",
        providerModel: "gpt-image-1",
        visibility: "draft",
        selectionState: "selected",
        variationGroupId: null,
        createdByUserId: "usr_admin",
        createdAt: "2026-03-25T00:00:00.000Z",
        updatedAt: "2026-03-25T00:00:00.000Z",
      },
    ]);
    selectHeroImageMock.mockResolvedValue({ assetId: "asset_candidate", heroImageAssetId: "asset_candidate" });
    rejectHeroImageMock.mockResolvedValue(undefined);
  });

  it("lists hero image candidates for admins", async () => {
    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/hero-images", "GET"),
      createParams("post_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listHeroCandidatesMock).toHaveBeenCalledWith("post_1");
    expect(payload.post.heroImageAssetId).toBe("asset_selected");
    expect(payload.assets).toHaveLength(1);
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());

    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/hero-images", "GET"),
      createParams("post_1"),
    );

    expect(response.status).toBe(403);
  });

  it("returns an empty asset list when a post has no hero candidates", async () => {
    listHeroCandidatesMock.mockResolvedValueOnce([]);

    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/hero-images", "GET"),
      createParams("post_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.assets).toEqual([]);
  });

  it("selects a hero image candidate", async () => {
    const response = await PATCH(
      createRouteRequest("/api/admin/blog/posts/post_1/hero-images", "PATCH", {
        action: "select",
        assetId: "asset_candidate",
      }),
      createParams("post_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(selectHeroImageMock).toHaveBeenCalledWith("post_1", "asset_candidate", "admin_1");
    expect(payload.ok).toBe(true);
  });

  it("rejects malformed mutation payloads", async () => {
    const response = await PATCH(
      createRouteRequest("/api/admin/blog/posts/post_1/hero-images", "PATCH", {
        action: "select",
      }),
      createParams("post_1"),
    );

    expect(response.status).toBe(400);
    expect(selectHeroImageMock).not.toHaveBeenCalled();
  });

  it("rejects a non-canonical candidate", async () => {
    getBlogAssetRepositoryMock.mockReturnValue({
      listHeroCandidates: listHeroCandidatesMock,
      findById: vi.fn().mockResolvedValue({ id: "asset_candidate", selectionState: "rejected" }),
    });

    const response = await PATCH(
      createRouteRequest("/api/admin/blog/posts/post_1/hero-images", "PATCH", {
        action: "reject",
        assetId: "asset_candidate",
      }),
      createParams("post_1"),
    );

    expect(response.status).toBe(200);
    expect(rejectHeroImageMock).toHaveBeenCalledWith("post_1", "asset_candidate", "admin_1");
  });

  it("surfaces canonical-rejection conflicts", async () => {
    rejectHeroImageMock.mockRejectedValueOnce(new Error("The current canonical hero image cannot be rejected."));

    const response = await PATCH(
      createRouteRequest("/api/admin/blog/posts/post_1/hero-images", "PATCH", {
        action: "reject",
        assetId: "asset_selected",
      }),
      createParams("post_1"),
    );

    expect(response.status).toBe(409);
  });
});
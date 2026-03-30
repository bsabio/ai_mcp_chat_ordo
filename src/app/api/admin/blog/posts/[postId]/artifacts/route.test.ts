import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAdminSessionUser,
  createAuthenticatedSessionUser,
  createRouteRequest,
} from "../../../../../../../../tests/helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  getBlogPostRepositoryMock,
  getBlogPostArtifactRepositoryMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  getBlogPostRepositoryMock: vi.fn(),
  getBlogPostArtifactRepositoryMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogPostRepository: getBlogPostRepositoryMock,
  getBlogPostArtifactRepository: getBlogPostArtifactRepositoryMock,
}));

import { GET } from "./route";

function createParams(postId: string) {
  return { params: Promise.resolve({ postId }) };
}

describe("GET /api/admin/blog/posts/[postId]/artifacts", () => {
  const findById = vi.fn();
  const listByPost = vi.fn();
  const listByPostAndType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());
    getBlogPostRepositoryMock.mockReturnValue({ findById });
    getBlogPostArtifactRepositoryMock.mockReturnValue({
      listByPost,
      listByPostAndType,
    });
    findById.mockResolvedValue({
      id: "post_1",
      slug: "ai-governance-playbook",
      title: "AI Governance Playbook",
      status: "draft",
    });
    listByPost.mockResolvedValue([
      {
        id: "artifact_1",
        postId: "post_1",
        artifactType: "article_qa_report",
        payload: { summary: "Looks solid." },
        createdByUserId: "usr_admin",
        createdAt: "2026-03-25T00:00:00.000Z",
      },
    ]);
    listByPostAndType.mockResolvedValue([
      {
        id: "artifact_2",
        postId: "post_1",
        artifactType: "hero_image_prompt",
        payload: { prompt: "Editorial office scene" },
        createdByUserId: "usr_admin",
        createdAt: "2026-03-25T00:00:01.000Z",
      },
    ]);
  });

  it("returns all artifacts for an admin-inspected post", async () => {
    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/artifacts", "GET"),
      createParams("post_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(findById).toHaveBeenCalledWith("post_1");
    expect(listByPost).toHaveBeenCalledWith("post_1");
    expect(payload.post).toEqual({
      id: "post_1",
      slug: "ai-governance-playbook",
      title: "AI Governance Playbook",
      status: "draft",
    });
    expect(payload.artifacts).toHaveLength(1);
  });

  it("filters artifacts by artifact type", async () => {
    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/artifacts?artifactType=hero_image_prompt", "GET"),
      createParams("post_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listByPostAndType).toHaveBeenCalledWith("post_1", "hero_image_prompt");
    expect(listByPost).not.toHaveBeenCalled();
    expect(payload.artifacts).toHaveLength(1);
    expect(payload.artifacts[0]?.artifactType).toBe("hero_image_prompt");
  });

  it("returns an empty artifact array when a valid filter has no matches", async () => {
    listByPostAndType.mockResolvedValueOnce([]);

    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/artifacts?artifactType=hero_image_prompt", "GET"),
      createParams("post_1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.post.id).toBe("post_1");
    expect(payload.artifacts).toEqual([]);
  });

  it("rejects invalid artifact types", async () => {
    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/artifacts?artifactType=unknown_type", "GET"),
      createParams("post_1"),
    );

    expect(response.status).toBe(400);
    expect(findById).not.toHaveBeenCalled();
    expect(listByPost).not.toHaveBeenCalled();
    expect(listByPostAndType).not.toHaveBeenCalled();
  });

  it("rejects non-admin callers", async () => {
    getSessionUserMock.mockResolvedValueOnce(createAuthenticatedSessionUser());

    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/post_1/artifacts", "GET"),
      createParams("post_1"),
    );

    expect(response.status).toBe(403);
    expect(findById).not.toHaveBeenCalled();
    expect(listByPost).not.toHaveBeenCalled();
  });

  it("returns not found when the post does not exist", async () => {
    findById.mockResolvedValueOnce(null);

    const response = await GET(
      createRouteRequest("/api/admin/blog/posts/missing/artifacts", "GET"),
      createParams("missing"),
    );

    expect(response.status).toBe(404);
    expect(listByPost).not.toHaveBeenCalled();
    expect(listByPostAndType).not.toHaveBeenCalled();
  });
});
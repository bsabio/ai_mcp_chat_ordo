import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/blog/assets/[id]/route";
import {
  createAdminSessionUser,
  createAnonymousSessionUser,
  createAuthenticatedSessionUser,
  createRouteParams,
  createRouteRequest,
} from "./helpers/workflow-route-fixture";

const {
  getSessionUserMock,
  findAssetByIdMock,
  findPostByIdMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  findAssetByIdMock: vi.fn(),
  findPostByIdMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/adapters/RepositoryFactory", () => ({
  getBlogAssetRepository: () => ({
    findById: findAssetByIdMock,
  }),
  getBlogPostRepository: () => ({
    findById: findPostByIdMock,
  }),
}));

describe("/api/blog/assets/[id]", () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-ordo-blog-assets-"));
    process.env.STUDIO_ORDO_BLOG_ASSET_ROOT = tempDir;
  });

  afterEach(() => {
    delete process.env.STUDIO_ORDO_BLOG_ASSET_ROOT;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("serves published hero assets publicly", async () => {
    fs.mkdirSync(path.join(tempDir, "2026/post-a"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "2026/post-a/hero.png"), "png-binary");

    findAssetByIdMock.mockResolvedValue({
      id: "asset_public",
      postId: "post_a",
      kind: "hero",
      storagePath: "2026/post-a/hero.png",
      mimeType: "image/png",
      width: 1200,
      height: 630,
      altText: "A published hero image.",
      sourcePrompt: null,
      provider: null,
      providerModel: null,
      visibility: "published",
      createdByUserId: "usr_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    findPostByIdMock.mockResolvedValue({
      id: "post_a",
      slug: "post-a",
      title: "Post A",
      description: "Published post.",
      content: "Body",
      heroImageAssetId: "asset_public",
      status: "published",
      publishedAt: "2026-01-02T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      createdByUserId: "usr_owner",
      publishedByUserId: "usr_admin",
    });

    const response = await GET(
      createRouteRequest("/api/blog/assets/asset_public"),
      createRouteParams("asset_public"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(Buffer.from(await response.arrayBuffer()).toString("utf8")).toBe("png-binary");
  });

  it("returns 401 for anonymous draft asset requests", async () => {
    findAssetByIdMock.mockResolvedValue({
      id: "asset_draft",
      postId: "post_draft",
      kind: "hero",
      storagePath: "2026/post-draft/hero.png",
      mimeType: "image/png",
      width: null,
      height: null,
      altText: "Draft hero image.",
      sourcePrompt: null,
      provider: null,
      providerModel: null,
      visibility: "draft",
      createdByUserId: "usr_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    findPostByIdMock.mockResolvedValue({ status: "draft" });
    getSessionUserMock.mockResolvedValue(createAnonymousSessionUser());

    const response = await GET(
      createRouteRequest("/api/blog/assets/asset_draft"),
      createRouteParams("asset_draft"),
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for authenticated users who do not own the draft asset", async () => {
    findAssetByIdMock.mockResolvedValue({
      id: "asset_private",
      postId: null,
      kind: "hero",
      storagePath: "2026/private/hero.png",
      mimeType: "image/png",
      width: null,
      height: null,
      altText: "Private hero image.",
      sourcePrompt: null,
      provider: null,
      providerModel: null,
      visibility: "draft",
      createdByUserId: "usr_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_other" }));

    const response = await GET(
      createRouteRequest("/api/blog/assets/asset_private"),
      createRouteParams("asset_private"),
    );

    expect(response.status).toBe(403);
  });

  it("does not expose non-selected published-post candidates publicly", async () => {
    findAssetByIdMock.mockResolvedValue({
      id: "asset_candidate",
      postId: "post_public",
      kind: "hero",
      storagePath: "2026/post-public/candidate.png",
      mimeType: "image/png",
      width: null,
      height: null,
      altText: "Candidate image.",
      sourcePrompt: null,
      provider: null,
      providerModel: null,
      visibility: "published",
      selectionState: "candidate",
      variationGroupId: null,
      createdByUserId: "usr_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    findPostByIdMock.mockResolvedValue({
      id: "post_public",
      status: "published",
      heroImageAssetId: "asset_selected",
    });
    getSessionUserMock.mockResolvedValue(createAnonymousSessionUser());

    const response = await GET(
      createRouteRequest("/api/blog/assets/asset_candidate"),
      createRouteParams("asset_candidate"),
    );

    expect(response.status).toBe(401);
  });

  it("allows owners and admins to inspect draft assets", async () => {
    fs.mkdirSync(path.join(tempDir, "2026/private"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "2026/private/hero.png"), "draft-binary");

    findAssetByIdMock.mockResolvedValue({
      id: "asset_owner",
      postId: null,
      kind: "hero",
      storagePath: "2026/private/hero.png",
      mimeType: "image/png",
      width: null,
      height: null,
      altText: "Owner hero image.",
      sourcePrompt: null,
      provider: null,
      providerModel: null,
      visibility: "draft",
      createdByUserId: "usr_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    getSessionUserMock.mockResolvedValue(createAuthenticatedSessionUser({ id: "usr_owner" }));
    const ownerResponse = await GET(
      createRouteRequest("/api/blog/assets/asset_owner"),
      createRouteParams("asset_owner"),
    );

    getSessionUserMock.mockResolvedValue(createAdminSessionUser({ id: "usr_admin" }));
    const adminResponse = await GET(
      createRouteRequest("/api/blog/assets/asset_owner"),
      createRouteParams("asset_owner"),
    );

    expect(ownerResponse.status).toBe(200);
    expect(adminResponse.status).toBe(200);
    expect(ownerResponse.headers.get("Cache-Control")).toContain("private");
  });

  it("returns 404 when the file is missing or the storage path escapes the asset root", async () => {
    findAssetByIdMock.mockResolvedValueOnce({
      id: "asset_missing",
      postId: null,
      kind: "hero",
      storagePath: "2026/missing/hero.png",
      mimeType: "image/png",
      width: null,
      height: null,
      altText: "Missing file.",
      sourcePrompt: null,
      provider: null,
      providerModel: null,
      visibility: "draft",
      createdByUserId: "usr_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    findAssetByIdMock.mockResolvedValueOnce({
      id: "asset_escape",
      postId: null,
      kind: "hero",
      storagePath: "../escape.png",
      mimeType: "image/png",
      width: null,
      height: null,
      altText: "Escaped file.",
      sourcePrompt: null,
      provider: null,
      providerModel: null,
      visibility: "draft",
      createdByUserId: "usr_owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    getSessionUserMock.mockResolvedValue(createAdminSessionUser());

    const missingResponse = await GET(
      createRouteRequest("/api/blog/assets/asset_missing"),
      createRouteParams("asset_missing"),
    );
    const escapeResponse = await GET(
      createRouteRequest("/api/blog/assets/asset_escape"),
      createRouteParams("asset_escape"),
    );

    expect(missingResponse.status).toBe(404);
    expect(escapeResponse.status).toBe(404);
  });
});
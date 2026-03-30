import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";

import { BlogAssetDataMapper } from "@/adapters/BlogAssetDataMapper";
import { BlogPostDataMapper } from "@/adapters/BlogPostDataMapper";
import { ensureSchema } from "@/lib/db/schema";

describe("BlogAssetDataMapper", () => {
  let db: Database.Database;
  let assetRepo: BlogAssetDataMapper;
  let postRepo: BlogPostDataMapper;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    ensureSchema(db);
    db.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`)
      .run("usr_admin", "admin@example.com", "Admin");
    assetRepo = new BlogAssetDataMapper(db);
    postRepo = new BlogPostDataMapper(db);
  });

  it("creates, attaches, publishes, and links a hero asset", async () => {
    const post = await postRepo.create({
      slug: "asset-ready-post",
      title: "Asset Ready Post",
      description: "A post with a hero image.",
      content: "## Asset\n\nPost content.",
      createdByUserId: "usr_admin",
    });

    const asset = await assetRepo.create({
      kind: "hero",
      storagePath: "2026/asset-ready-post/hero.png",
      mimeType: "image/png",
      width: 1200,
      height: 630,
      altText: "A geometric hero illustration.",
      createdByUserId: "usr_admin",
    });

    const attachedAsset = await assetRepo.attachToPost(asset.id, post.id);
    const publishedAsset = await assetRepo.setVisibility(asset.id, "published");
    const linkedPost = await postRepo.setHeroImageAsset(post.id, asset.id);
    const postAssets = await assetRepo.listByPost(post.id);

    expect(attachedAsset.postId).toBe(post.id);
    expect(publishedAsset.visibility).toBe("published");
    expect(linkedPost.heroImageAssetId).toBe(asset.id);
    expect(postAssets.map((entry) => entry.id)).toEqual([asset.id]);
  });

  it("tracks hero candidate selection state and lists selected assets first", async () => {
    const post = await postRepo.create({
      slug: "asset-selection-post",
      title: "Asset Selection Post",
      description: "Selection test.",
      content: "## Selection\n\nContent.",
      createdByUserId: "usr_admin",
    });

    const older = await assetRepo.create({
      postId: post.id,
      kind: "hero",
      storagePath: "2026/asset-selection-post/hero-older.png",
      mimeType: "image/png",
      altText: "Older candidate.",
      selectionState: "candidate",
      createdByUserId: "usr_admin",
    });
    const selected = await assetRepo.create({
      postId: post.id,
      kind: "hero",
      storagePath: "2026/asset-selection-post/hero-selected.png",
      mimeType: "image/png",
      altText: "Selected candidate.",
      selectionState: "selected",
      createdByUserId: "usr_admin",
    });

    await assetRepo.setSelectionState(older.id, "rejected");

    const candidates = await assetRepo.listHeroCandidates(post.id);

    expect(candidates.map((entry) => entry.id)).toEqual([selected.id, older.id]);
    expect(candidates[0]?.selectionState).toBe("selected");
    expect(candidates[1]?.selectionState).toBe("rejected");
  });

  it("detaches an asset without deleting it", async () => {
    const post = await postRepo.create({
      slug: "asset-detach-post",
      title: "Asset Detach Post",
      description: "Detach test.",
      content: "## Detach\n\nContent.",
      createdByUserId: "usr_admin",
    });
    const asset = await assetRepo.create({
      postId: post.id,
      kind: "hero",
      storagePath: "2026/asset-detach-post/hero.png",
      mimeType: "image/png",
      altText: "Detached hero asset.",
      createdByUserId: "usr_admin",
    });

    const detachedAsset = await assetRepo.detachFromPost(asset.id);

    expect(detachedAsset.postId).toBeNull();
    expect(await assetRepo.findById(asset.id)).toMatchObject({ id: asset.id, postId: null });
  });
});
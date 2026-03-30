import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getBlogAssetUrl } from "@/lib/blog/hero-images";
import { resolveBlogAssetDiskPath } from "@/lib/blog/blog-asset-storage";
import type { BlogPostArtifactRepository } from "@/core/use-cases/BlogPostArtifactRepository";
import type { BlogPostRepository } from "@/core/use-cases/BlogPostRepository";
import type { BlogAssetRepository } from "@/core/use-cases/BlogAssetRepository";
import type {
  BlogImageGenerationRequest,
  BlogImageProvider,
} from "@/core/use-cases/BlogImageProvider";
import type { BlogPost } from "@/core/entities/blog";

export interface GenerateBlogImageInput {
  postId?: string;
  prompt: string;
  altText: string;
  size: BlogImageGenerationRequest["size"];
  quality: BlogImageGenerationRequest["quality"];
  preset?: BlogImageGenerationRequest["preset"];
  enhancePrompt: boolean;
  setAsHero?: boolean;
  variationGroupId?: string | null;
  createdByUserId: string;
}

export interface GenerateBlogImageOutput {
  assetId: string;
  postId: string | null;
  postSlug: string | null;
  title: string | null;
  heroImageAssetId: string;
  visibility: "draft" | "published";
  imageUrl: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  originalPrompt: string;
  finalPrompt: string;
  selectionState: "selected" | "candidate" | "rejected";
  variationGroupId: string | null;
  summary: string;
}

function sanitizePathSegment(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || "asset";
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
    default:
      return "png";
  }
}

function buildStoragePath(post: BlogPost | null, extension: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const base = post ? sanitizePathSegment(post.slug) : `unattached-${randomUUID().slice(0, 8)}`;
  return `${year}/${month}/${base}/hero-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
}

export class BlogImageGenerationService {
  constructor(
    private readonly blogRepo: BlogPostRepository,
    private readonly assetRepo: BlogAssetRepository,
    private readonly provider: BlogImageProvider,
    private readonly artifactRepo?: BlogPostArtifactRepository,
  ) {}

  async generate(input: GenerateBlogImageInput): Promise<GenerateBlogImageOutput> {
    const post = input.postId ? await this.requirePost(input.postId) : null;
    const setAsHero = input.setAsHero ?? true;
    const generation = await this.provider.generate({
      prompt: input.prompt,
      size: input.size,
      quality: input.quality,
      preset: input.preset,
      enhancePrompt: input.enhancePrompt,
    });

    const extension = extensionForMimeType(generation.mimeType);
    const storagePath = buildStoragePath(post, extension);
    const diskPath = resolveBlogAssetDiskPath(storagePath);
    await mkdir(path.dirname(diskPath), { recursive: true });
    await writeFile(diskPath, generation.bytes);

    const visibility = post && setAsHero && post.status === "published"
      ? "published"
      : "draft";
    const selectionState = post && setAsHero ? "selected" : "candidate";
    const asset = await this.assetRepo.create({
      postId: post?.id ?? null,
      kind: "hero",
      storagePath,
      mimeType: generation.mimeType,
      width: generation.width,
      height: generation.height,
      altText: input.altText,
      sourcePrompt: generation.finalPrompt,
      provider: generation.provider,
      providerModel: generation.model,
      visibility,
      selectionState,
      variationGroupId: input.variationGroupId ?? null,
      createdByUserId: input.createdByUserId,
    });

    if (post && setAsHero) {
      await this.selectHeroImage(post.id, asset.id, input.createdByUserId);
    }

    return {
      assetId: asset.id,
      postId: post?.id ?? null,
      postSlug: post?.slug ?? null,
      title: post?.title ?? null,
      heroImageAssetId: asset.id,
      visibility,
      imageUrl: getBlogAssetUrl(asset.id),
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      originalPrompt: generation.originalPrompt,
      finalPrompt: generation.finalPrompt,
      selectionState: setAsHero && post ? "selected" : asset.selectionState,
      variationGroupId: asset.variationGroupId,
      summary: post
        ? setAsHero
          ? `Generated hero image for "${post.title}" and linked it at /journal/${post.slug}.`
          : `Generated hero image candidate for "${post.title}".`
        : `Generated draft hero image asset ${asset.id}.`,
    };
  }

  async listHeroCandidates(postId: string) {
    await this.requirePost(postId);
    return this.assetRepo.listHeroCandidates(postId);
  }

  async selectHeroImage(
    postId: string,
    assetId: string,
    selectedByUserId: string,
  ): Promise<GenerateBlogImageOutput> {
    const post = await this.requirePost(postId);
    const assets = await this.assetRepo.listHeroCandidates(postId);
    const target = assets.find((asset) => asset.id === assetId && asset.kind === "hero");

    if (!target) {
      throw new Error(`Hero image asset not found for post: ${assetId}`);
    }

    const previousAssetId = post.heroImageAssetId;

    for (const asset of assets) {
      if (asset.id === assetId) {
        if (asset.selectionState !== "selected") {
          await this.assetRepo.setSelectionState(asset.id, "selected");
        }
        if (post.status === "published" && asset.visibility !== "published") {
          await this.assetRepo.setVisibility(asset.id, "published");
        }
      } else {
        const nextSelectionState = asset.selectionState === "rejected" ? "rejected" : "candidate";
        if (asset.selectionState !== nextSelectionState) {
          await this.assetRepo.setSelectionState(asset.id, nextSelectionState);
        }
        if (asset.visibility !== "draft") {
          await this.assetRepo.setVisibility(asset.id, "draft");
        }
      }
    }

    await this.blogRepo.setHeroImageAsset(post.id, assetId);
    await this.recordSelectionArtifact(post.id, selectedByUserId, {
      action: "select",
      selectedAssetId: assetId,
      previousAssetId,
      postStatus: post.status,
    });

    const selectedAsset = await this.assetRepo.findById(assetId);
    if (!selectedAsset) {
      throw new Error(`Blog asset not found: ${assetId}`);
    }

    return {
      assetId: selectedAsset.id,
      postId: post.id,
      postSlug: post.slug,
      title: post.title,
      heroImageAssetId: selectedAsset.id,
      visibility: post.status === "published" ? "published" : "draft",
      imageUrl: getBlogAssetUrl(selectedAsset.id),
      mimeType: selectedAsset.mimeType,
      width: selectedAsset.width,
      height: selectedAsset.height,
      originalPrompt: selectedAsset.sourcePrompt ?? "",
      finalPrompt: selectedAsset.sourcePrompt ?? "",
      selectionState: "selected",
      variationGroupId: selectedAsset.variationGroupId,
      summary: `Selected hero image ${selectedAsset.id} for "${post.title}".`,
    };
  }

  async rejectHeroImage(
    postId: string,
    assetId: string,
    rejectedByUserId: string,
  ): Promise<void> {
    const post = await this.requirePost(postId);

    if (post.heroImageAssetId === assetId) {
      throw new Error("The current canonical hero image cannot be rejected.");
    }

    const assets = await this.assetRepo.listHeroCandidates(postId);
    const target = assets.find((asset) => asset.id === assetId && asset.kind === "hero");

    if (!target) {
      throw new Error(`Hero image asset not found for post: ${assetId}`);
    }

    await this.assetRepo.setSelectionState(assetId, "rejected");
    if (target.visibility !== "draft") {
      await this.assetRepo.setVisibility(assetId, "draft");
    }
    await this.recordSelectionArtifact(post.id, rejectedByUserId, {
      action: "reject",
      assetId,
      currentCanonicalAssetId: post.heroImageAssetId,
      postStatus: post.status,
    });
  }

  async publishHeroAssetForPost(postId: string): Promise<void> {
    const post = await this.blogRepo.findById(postId);

    if (!post?.heroImageAssetId) {
      return;
    }

    const assets = await this.assetRepo.listHeroCandidates(postId);
    for (const asset of assets) {
      await this.assetRepo.setVisibility(
        asset.id,
        asset.id === post.heroImageAssetId ? "published" : "draft",
      );
    }
  }

  private async requirePost(postId: string): Promise<BlogPost> {
    const post = await this.blogRepo.findById(postId);

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    return post;
  }

  private async recordSelectionArtifact(
    postId: string,
    createdByUserId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (!this.artifactRepo) {
      return;
    }

    await this.artifactRepo.create({
      postId,
      artifactType: "hero_image_selection",
      payload,
      createdByUserId,
    });
  }
}
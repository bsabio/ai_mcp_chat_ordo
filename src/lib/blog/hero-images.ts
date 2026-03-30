import { getBlogAssetRepository } from "@/adapters/RepositoryFactory";
import type { BlogAsset } from "@/core/entities/blog-asset";
import type { BlogPost } from "@/core/entities/blog";

export interface BlogHeroAssetViewModel {
  id: string;
  altText: string;
  width: number | null;
  height: number | null;
}

export function getBlogAssetUrl(assetId: string): string {
  return `/api/blog/assets/${assetId}`;
}

function isPublishedHeroAsset(post: BlogPost, asset: BlogAsset | null): asset is BlogAsset {
  return Boolean(
    asset
      && asset.id === post.heroImageAssetId
      && asset.postId === post.id
      && asset.kind === "hero"
      && asset.visibility === "published",
  );
}

export async function loadPublishedHeroAsset(post: BlogPost): Promise<BlogAsset | null> {
  if (!post.heroImageAssetId) {
    return null;
  }

  const asset = await getBlogAssetRepository().findById(post.heroImageAssetId);
  return isPublishedHeroAsset(post, asset) ? asset : null;
}

export async function loadPublishedHeroAssets(posts: BlogPost[]): Promise<Map<string, BlogAsset>> {
  const pairs = await Promise.all(
    posts.map(async (post) => {
      const asset = await loadPublishedHeroAsset(post);
      return asset ? [post.id, asset] : null;
    }),
  );

  return new Map(
    pairs.filter((entry): entry is [string, BlogAsset] => entry !== null),
  );
}
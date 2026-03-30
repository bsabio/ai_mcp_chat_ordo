import type {
  BlogPostArtifact,
  BlogPostArtifactSeed,
  BlogPostArtifactType,
} from "@/core/entities/blog-artifact";

export interface BlogPostArtifactRepository {
  create(seed: BlogPostArtifactSeed): Promise<BlogPostArtifact>;
  listByPost(postId: string): Promise<BlogPostArtifact[]>;
  listByPostAndType(
    postId: string,
    artifactType: BlogPostArtifactType,
  ): Promise<BlogPostArtifact[]>;
}
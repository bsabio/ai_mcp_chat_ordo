import type { BlogPostRevision, BlogPostRevisionSeed } from "@/core/entities/blog-revision";

export interface BlogPostRevisionRepository {
  create(seed: BlogPostRevisionSeed): Promise<BlogPostRevision>;
  findById(id: string): Promise<BlogPostRevision | null>;
  listByPostId(postId: string): Promise<BlogPostRevision[]>;
}
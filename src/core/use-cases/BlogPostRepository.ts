import type { BlogPost, BlogPostSeed } from "@/core/entities/blog";

export interface BlogPostRepository {
  create(seed: BlogPostSeed): Promise<BlogPost>;
  findById(id: string): Promise<BlogPost | null>;
  findBySlug(slug: string): Promise<BlogPost | null>;
  listPublished(): Promise<BlogPost[]>;
  publishById(id: string, publishedByUserId: string): Promise<BlogPost>;
}

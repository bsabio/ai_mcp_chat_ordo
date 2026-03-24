export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  publishedByUserId: string | null;
}

export interface BlogPostSeed {
  slug: string;
  title: string;
  description: string;
  content: string;
  createdByUserId: string;
}

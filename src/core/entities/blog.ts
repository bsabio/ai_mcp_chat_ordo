export type BlogPostStatus = "draft" | "review" | "approved" | "published";

export type BlogPostSection = "essay" | "briefing";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  standfirst?: string | null;
  section?: BlogPostSection | null;
  heroImageAssetId: string | null;
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
  standfirst?: string | null;
  section?: BlogPostSection | null;
  createdByUserId: string;
}

export interface BlogPostAdminFilters {
  search?: string;
  status?: BlogPostStatus;
  section?: BlogPostSection;
  limit?: number;
}

export interface BlogPostDraftPatch {
  title?: string;
  description?: string;
  content?: string;
}

export interface BlogPostEditorialMetadataPatch {
  slug?: string;
  title?: string;
  description?: string;
  standfirst?: string | null;
  section?: BlogPostSection | null;
}

import type { BlogPostSection, BlogPostStatus } from "@/core/entities/blog";

export interface BlogPostRevisionSnapshot {
  slug: string;
  title: string;
  description: string;
  standfirst: string | null;
  content: string;
  section: BlogPostSection | null;
  status: BlogPostStatus;
}

export interface BlogPostRevision {
  id: string;
  postId: string;
  snapshot: BlogPostRevisionSnapshot;
  changeNote: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface BlogPostRevisionSeed {
  postId: string;
  snapshot: BlogPostRevisionSnapshot;
  changeNote?: string | null;
  createdByUserId: string;
}
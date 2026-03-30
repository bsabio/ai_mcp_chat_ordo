import { createAdminEntityRoutes } from "@/lib/admin/shared/admin-route-helpers";

const journalRoutes = createAdminEntityRoutes("/admin/journal", { preview: true });

export function getAdminJournalListPath(): string {
  return journalRoutes.list();
}

export function getAdminJournalDetailPath(postId: string): string {
  return journalRoutes.detail(postId);
}

export function getAdminJournalPreviewPath(slug: string): string {
  return journalRoutes.preview!(slug);
}

export function getAdminBlogHeroImagesApiPath(postId: string): string {
  return `/api/admin/blog/posts/${encodeURIComponent(postId)}/hero-images`;
}

export function getAdminBlogArtifactsApiPath(postId: string): string {
  return `/api/admin/blog/posts/${encodeURIComponent(postId)}/artifacts`;
}
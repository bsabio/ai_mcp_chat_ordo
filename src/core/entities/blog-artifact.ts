export type BlogPostArtifactType =
  | "article_generation_prompt"
  | "article_generation_result"
  | "article_qa_report"
  | "article_qa_resolution"
  | "hero_image_prompt"
  | "hero_image_generation_result"
  | "hero_image_selection";

export interface BlogPostArtifact {
  id: string;
  postId: string;
  artifactType: BlogPostArtifactType;
  payload: unknown;
  createdByUserId: string;
  createdAt: string;
}

export interface BlogPostArtifactSeed {
  postId: string;
  artifactType: BlogPostArtifactType;
  payload: unknown;
  createdByUserId: string;
}
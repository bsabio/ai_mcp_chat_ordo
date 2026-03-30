import type { NextRequest } from "next/server";

import { getBlogPostArtifactRepository, getBlogPostRepository } from "@/adapters/RepositoryFactory";
import type { BlogPostArtifactType } from "@/core/entities/blog-artifact";
import { getSessionUser } from "@/lib/auth";

const VALID_ARTIFACT_TYPES = new Set<BlogPostArtifactType>([
  "article_generation_prompt",
  "article_generation_result",
  "article_qa_report",
  "article_qa_resolution",
  "hero_image_prompt",
  "hero_image_generation_result",
  "hero_image_selection",
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Blog artifact inspection is restricted to administrators." },
      { status: 403 },
    );
  }

  const { postId } = await context.params;

  if (!postId) {
    return Response.json(
      { error: "postId is required." },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const requestedArtifactType = url.searchParams.get("artifactType");
  const artifactType = requestedArtifactType?.trim() || null;

  if (artifactType && !VALID_ARTIFACT_TYPES.has(artifactType as BlogPostArtifactType)) {
    return Response.json(
      { error: "artifactType must be one of the supported blog artifact types." },
      { status: 400 },
    );
  }

  const blogRepo = getBlogPostRepository();
  const post = await blogRepo.findById(postId);

  if (!post) {
    return Response.json(
      { error: "Blog post not found." },
      { status: 404 },
    );
  }

  const artifactRepo = getBlogPostArtifactRepository();
  const artifacts = artifactType
    ? await artifactRepo.listByPostAndType(postId, artifactType as BlogPostArtifactType)
    : await artifactRepo.listByPost(postId);

  return Response.json({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      status: post.status,
    },
    artifacts,
  });
}
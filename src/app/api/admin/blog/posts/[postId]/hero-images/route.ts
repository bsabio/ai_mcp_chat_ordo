import type { NextRequest } from "next/server";

import { getBlogAssetRepository, getBlogPostRepository } from "@/adapters/RepositoryFactory";
import { getSessionUser } from "@/lib/auth";
import { getBlogImageGenerationService } from "@/lib/blog/blog-production-root";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Blog hero image management is restricted to administrators." },
      { status: 403 },
    );
  }

  const { postId } = await context.params;

  if (!postId) {
    return Response.json({ error: "postId is required." }, { status: 400 });
  }

  const blogRepo = getBlogPostRepository();
  const post = await blogRepo.findById(postId);

  if (!post) {
    return Response.json({ error: "Blog post not found." }, { status: 404 });
  }

  const assets = await getBlogAssetRepository().listHeroCandidates(postId);

  return Response.json({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      status: post.status,
      heroImageAssetId: post.heroImageAssetId,
    },
    assets,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const user = await getSessionUser();

  if (!user.roles.includes("ADMIN")) {
    return Response.json(
      { error: "Blog hero image management is restricted to administrators." },
      { status: 403 },
    );
  }

  const { postId } = await context.params;

  if (!postId) {
    return Response.json({ error: "postId is required." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    assetId?: unknown;
  } | null;

  if (!body || typeof body.assetId !== "string" || (body.action !== "select" && body.action !== "reject")) {
    return Response.json(
      { error: "action (select|reject) and assetId are required." },
      { status: 400 },
    );
  }

  const blogRepo = getBlogPostRepository();
  const post = await blogRepo.findById(postId);
  if (!post) {
    return Response.json({ error: "Blog post not found." }, { status: 404 });
  }

  const service = getBlogImageGenerationService();

  try {
    if (body.action === "select") {
      const result = await service.selectHeroImage(postId, body.assetId, user.id);
      return Response.json({
        ok: true,
        action: body.action,
        result,
      });
    }

    await service.rejectHeroImage(postId, body.assetId, user.id);
    const asset = await getBlogAssetRepository().findById(body.assetId);
    return Response.json({
      ok: true,
      action: body.action,
      asset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update hero image.";
    if (/not found/i.test(message)) {
      return Response.json({ error: message }, { status: 404 });
    }
    if (/cannot be rejected/i.test(message)) {
      return Response.json({ error: message }, { status: 409 });
    }

    return Response.json({ error: message }, { status: 400 });
  }
}
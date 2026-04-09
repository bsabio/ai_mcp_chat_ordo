import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

import {
  getBlogAssetRepository,
  getBlogPostRepository,
} from "@/adapters/RepositoryFactory";
import { getSessionUser } from "@/lib/auth";
import { resolveBlogAssetDiskPath } from "@/lib/blog/blog-asset-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const assetRepo = getBlogAssetRepository();
  const blogRepo = getBlogPostRepository();
  const asset = await assetRepo.findById(id);

  if (!asset) {
    return NextResponse.json({ error: "Blog asset not found.", errorCode: "NOT_FOUND" }, { status: 404 });
  }

  const post = asset.postId ? await blogRepo.findById(asset.postId) : null;
  const isPublicAsset = Boolean(
    asset.visibility === "published"
      && asset.postId
      && post
      && post.status === "published"
      && post.heroImageAssetId === asset.id,
  );

  if (!isPublicAsset) {
    const sessionUser = await getSessionUser();

    if (sessionUser.roles.includes("ANONYMOUS")) {
      return NextResponse.json({ error: "Authentication required.", errorCode: "AUTH_ERROR" }, { status: 401 });
    }

    const isOwner = sessionUser.id === asset.createdByUserId;
    const isAdmin = sessionUser.roles.includes("ADMIN");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden.", errorCode: "FORBIDDEN" }, { status: 403 });
    }
  }

  let filePath: string;

  try {
    filePath = resolveBlogAssetDiskPath(asset.storagePath);
  } catch {
    return NextResponse.json({ error: "Blog asset not found.", errorCode: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const fileContents = await readFile(filePath);
    return new NextResponse(fileContents, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": isPublicAsset
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Blog asset not found.", errorCode: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to read blog asset.", errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
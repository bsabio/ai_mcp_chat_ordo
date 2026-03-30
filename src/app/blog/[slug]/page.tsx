import { notFound, redirect } from "next/navigation";

import { getBlogPostRepository } from "@/adapters/RepositoryFactory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Legacy Journal Article Redirect",
  description: "Compatibility route preserved while public journal articles move to /journal/[slug].",
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blogRepo = getBlogPostRepository();
  const post = await blogRepo.findBySlug(slug);

  if (!post || post.status !== "published") {
    notFound();
  }

  redirect(`/journal/${post.slug}`);
}

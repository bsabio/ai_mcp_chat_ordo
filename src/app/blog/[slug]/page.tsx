import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getBlogPostRepository } from "@/adapters/RepositoryFactory";
import { getInstanceIdentity } from "@/lib/config/instance";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blogRepo = getBlogPostRepository();
  const post = await blogRepo.findBySlug(slug);

  if (!post || post.status !== "published") {
    return {};
  }

  const identity = getInstanceIdentity();
  const url = `https://${identity.domain}/blog/${post.slug}`;

  return {
    title: `${post.title} | ${identity.name}`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
    },
  };
}

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

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-(--container-padding) py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          {post.publishedAt && (
            <time className="text-sm text-foreground/40">
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
        </header>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

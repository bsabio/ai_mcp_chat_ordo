import type { Metadata } from "next";
import Link from "next/link";

import { getBlogPostRepository } from "@/adapters/RepositoryFactory";
import { getInstanceIdentity } from "@/lib/config/instance";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const identity = getInstanceIdentity();
  const title = `Blog | ${identity.name}`;
  const description = `Latest articles and insights from ${identity.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://${identity.domain}/blog`,
      type: "website",
    },
  };
}

export default async function BlogIndexPage() {
  const blogRepo = getBlogPostRepository();
  const posts = await blogRepo.listPublished();
  const identity = getInstanceIdentity();

  return (
    <div className="min-h-screen text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-(--container-padding) py-12 sm:py-16">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{identity.name} Blog</h1>
          <p className="text-foreground/60">
            Latest articles and insights.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-foreground/48">No posts published yet.</p>
        ) : (
          <section className="flex flex-col gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-2 rounded-xl border border-foreground/8 p-6 transition-colors hover:border-foreground/16"
              >
                <h2 className="text-xl font-semibold group-hover:text-accent">
                  {post.title}
                </h2>
                {post.description && (
                  <p className="text-foreground/60">{post.description}</p>
                )}
                {post.publishedAt && (
                  <time className="text-sm text-foreground/40">
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

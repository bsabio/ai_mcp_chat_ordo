import type { MetadataRoute } from "next";
import { getInstanceIdentity } from "@/lib/config/instance";
import { getCorpusSummaries } from "@/lib/corpus-library";
import { getBlogPostRepository } from "@/adapters/RepositoryFactory";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const identity = getInstanceIdentity();
  const base = `https://${identity.domain}`;
  const now = new Date();

  const summaries = await getCorpusSummaries();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/library`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  const chapterEntries: MetadataRoute.Sitemap = [];
  for (const summary of summaries) {
    const slugs = summary.sectionSlugs;
    for (const chapterSlug of slugs) {
      chapterEntries.push({
        url: `${base}/library/${summary.slug}/${chapterSlug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  const blogRepo = getBlogPostRepository();
  const publishedPosts = await blogRepo.listPublished();

  const blogStaticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const blogPostEntries: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...chapterEntries, ...blogStaticEntries, ...blogPostEntries];
}

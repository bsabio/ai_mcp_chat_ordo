import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBlogPostRepository } from "@/adapters/RepositoryFactory";
import { MarkdownProse } from "@/components/MarkdownProse";
import {
  JournalArchiveNavigation,
  JournalArchiveCard,
  JournalArticleBody,
  JournalArticleHeader,
  JournalFeatureCard,
  JournalHeroFigure,
  JournalIntroCard,
  JournalPageShell,
  JournalSectionEmptyState,
  JournalSectionHeader,
  JournalStandfirst,
  JournalStoryCard,
} from "@/components/journal/JournalLayout";
import { getBlogAssetUrl, loadPublishedHeroAsset, loadPublishedHeroAssets } from "@/lib/blog/hero-images";
import { buildJournalPublicationStructure, describeJournalPost, splitJournalStandfirst } from "@/lib/blog/journal-taxonomy";
import { normalizeBlogMarkdown } from "@/lib/blog/normalize-markdown";
import { getInstanceIdentity } from "@/lib/config/instance";

function getJournalIndexUrl(domain: string): string {
  return `https://${domain}/journal`;
}

function getJournalPostUrl(domain: string, slug: string): string {
  return `https://${domain}/journal/${slug}`;
}

function getJournalPostHref(slug: string): string {
  return `/journal/${slug}`;
}

function formatPublishedDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function normalizeOpenerText(value: string | null | undefined) {
  return value
    ?.replace(/\s+/g, " ")
    .trim()
    .toLowerCase() ?? "";
}

export async function generatePublicJournalIndexMetadata(): Promise<Metadata> {
  const identity = getInstanceIdentity();
  const title = `Journal | ${identity.name}`;
  const description = `Latest journal articles and insights from ${identity.name}.`;
  const url = getJournalIndexUrl(identity.domain);
  const blogRepo = getBlogPostRepository();
  const posts = await blogRepo.listPublished();
  const heroAssets = await loadPublishedHeroAssets(posts);
  const representativeHeroAsset = posts
    .map((post) => heroAssets.get(post.id))
    .find((asset) => asset != null);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: representativeHeroAsset ? [{
        url: `https://${identity.domain}${getBlogAssetUrl(representativeHeroAsset.id)}`,
        alt: representativeHeroAsset.altText,
        width: representativeHeroAsset.width ?? 1200,
        height: representativeHeroAsset.height ?? 630,
      }] : undefined,
    },
  };
}

export async function renderPublicJournalIndexPage() {
  const blogRepo = getBlogPostRepository();
  const posts = await blogRepo.listPublished();
  const heroAssets = await loadPublishedHeroAssets(posts);
  const identity = getInstanceIdentity();
  const publication = buildJournalPublicationStructure(posts);
  const leadStory = publication.leadStory;
  const featuredHeroAsset = leadStory ? heroAssets.get(leadStory.post.id) : null;
  const latestPublished = posts[0]?.publishedAt
    ? new Date(posts[0].publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    : "No posts yet";
  const sectionCount = [publication.latestEssays.length > 0 ? "Essays" : null, publication.practicalBriefings.length > 0 ? "Briefings" : null]
    .filter(Boolean)
    .join(" / ") || "No live sections";

  return (
    <JournalPageShell>
      <JournalIntroCard
        kicker={`${identity.name} Journal`}
        title="Clear writing about systems and operations."
        dek="Published work from Studio Ordo. Essays carry longer arguments. Briefings carry procedures, audits, and release notes."
        meta={[
          { label: "Latest", value: latestPublished },
          { label: "Posts", value: String(posts.length) },
          { label: "Live sections", value: sectionCount },
        ]}
      />

      {posts.length === 0 ? (
        <section className="journal-empty-shell rounded-4xl px-(--space-6) py-(--space-12) sm:px-(--space-10)" data-journal-surface="empty-shell">
          <p className="max-w-2xl text-lg leading-8 text-foreground/64">No posts published yet.</p>
        </section>
      ) : (
        <>
          {leadStory ? (
            <section className="flex flex-col gap-(--space-section-tight)">
              <JournalFeatureCard
                href={getJournalPostHref(leadStory.post.slug)}
                eyebrow={leadStory.sectionLabel}
                date={leadStory.publishedLabel}
                readingTime={leadStory.readingTime}
                title={leadStory.post.title}
                description={leadStory.post.description}
                image={featuredHeroAsset ? {
                  src: getBlogAssetUrl(featuredHeroAsset.id),
                  alt: featuredHeroAsset.altText,
                  width: featuredHeroAsset.width ?? 1200,
                  height: featuredHeroAsset.height ?? 630,
                } : null}
              />
            </section>
          ) : null}

          <section className="grid gap-(--space-6) xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] xl:items-start">
            <div data-journal-region="essays" className="flex flex-col gap-(--space-section-tight)">
              <JournalSectionHeader
                eyebrow="Latest essays"
                title="Longer arguments"
                description="Slower pieces. More context. Less scanning."
              />
              {publication.latestEssays.length > 0 ? (
                <div className="grid gap-(--space-section-tight) xl:grid-cols-1">
                  {publication.latestEssays.map((entry) => (
                    <JournalStoryCard
                      key={entry.post.id}
                      href={getJournalPostHref(entry.post.slug)}
                      eyebrow={entry.sectionLabel}
                      title={entry.post.title}
                      description={entry.post.description}
                      meta={[entry.publishedLabel ?? "Undated", entry.readingTime]}
                      tone="essay"
                    />
                  ))}
                </div>
              ) : (
                <JournalSectionEmptyState
                  title="No essays right now"
                  description="Nothing is being forced into this slot. When an essay is published, it goes here."
                  tone="essay"
                />
              )}
            </div>

            <div data-journal-region="briefings" className="flex flex-col gap-(--space-section-tight)">
              <JournalSectionHeader
                eyebrow="Practical briefings"
                title="Operational work"
                description="Procedures, audits, release notes, and implementation details."
              />
              {publication.practicalBriefings.length > 0 ? (
                <div className="grid gap-(--space-3)">
                  {publication.practicalBriefings.map((entry) => (
                    <JournalStoryCard
                      key={entry.post.id}
                      href={getJournalPostHref(entry.post.slug)}
                      eyebrow={entry.sectionLabel}
                      title={entry.post.title}
                      description={entry.post.description}
                      meta={[entry.publishedLabel ?? "Undated", entry.readingTime]}
                      tone="briefing"
                    />
                  ))}
                </div>
              ) : (
                <JournalSectionEmptyState
                  title="No briefings right now"
                  description="No backfill. No placeholder. This section stays empty until there is real operational work to publish."
                  tone="briefing"
                />
              )}

              {publication.archiveGroups.length > 0 ? (
                <JournalArchiveNavigation
                  groups={publication.archiveGroups.map((group) => ({
                    year: group.year,
                    href: group.href,
                    count: group.posts.length,
                  }))}
                />
              ) : null}
            </div>
          </section>

          {publication.archiveGroups.length > 0 ? (
            <section data-journal-region="archive" className="flex flex-col gap-(--space-section-tight)">
              <JournalSectionHeader
                eyebrow="Archive"
                title="Back issues"
                description="Older work only. Live shelf entries do not repeat here."
              />
              <div className="journal-archive-shell px-(--space-inset-panel) py-(--space-inset-panel)" data-journal-surface="archive-shell">
                {publication.archiveGroups.map((group) => (
                  <section key={group.year} id={`archive-${group.year.toLowerCase()}`} className="flex scroll-mt-(--space-28) flex-col gap-(--space-4) first:pt-(--space-0) not-first:border-t not-first:border-foreground/8 not-first:pt-(--space-6)">
                    <div className="journal-archive-year-header flex items-end justify-between gap-(--space-4) pb-(--space-3)">
                      <div>
                        <p className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.16em] text-foreground/60">Year</p>
                        <h3 className="font-(--font-display) text-[1.7rem] leading-[0.98] tracking-[-0.04em]">{group.year}</h3>
                      </div>
                      <span className="font-(--font-label) text-[0.64rem] uppercase tracking-[0.16em] text-foreground/60">{group.posts.length} entries</span>
                    </div>
                    <div className="flex flex-col">
                      {group.posts.map((entry) => (
                        <JournalArchiveCard
                          key={entry.post.id}
                          href={getJournalPostHref(entry.post.slug)}
                          date={entry.publishedLabel}
                          kicker={entry.sectionLabel}
                          title={entry.post.title}
                          description={entry.post.description}
                          image={null}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </JournalPageShell>
  );
}

export async function generatePublicJournalPostMetadata({
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
  const url = getJournalPostUrl(identity.domain, post.slug);
  const heroAsset = await loadPublishedHeroAsset(post);

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
      images: heroAsset ? [{
        url: `https://${identity.domain}${getBlogAssetUrl(heroAsset.id)}`,
        alt: heroAsset.altText,
        width: heroAsset.width ?? 1200,
        height: heroAsset.height ?? 630,
      }] : undefined,
    },
  };
}

export async function renderPublicJournalPostPage({
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

  const normalizedContent = normalizeBlogMarkdown(post.title, post.content);
  const { standfirst, body } = splitJournalStandfirst(normalizedContent, post.standfirst);
  const articleProfile = describeJournalPost(post);
  const heroAsset = await loadPublishedHeroAsset(post);
  const identity = getInstanceIdentity();
  const publishedDate = formatPublishedDate(post.publishedAt);
  const fallbackDek = `An essay from the ${identity.name} journal archive.`;
  const duplicateOpenerCopy = standfirst != null
    && normalizeOpenerText(standfirst) !== ""
    && normalizeOpenerText(standfirst) === normalizeOpenerText(post.description);
  const dek = duplicateOpenerCopy ? null : (post.description ?? fallbackDek);
  const identityLink = identity.linkedInUrl ? {
    href: identity.linkedInUrl,
    label: `${identity.name} on LinkedIn`,
  } : null;

  return (
    <JournalPageShell narrow>
      <JournalArticleHeader
        kicker={`${identity.name} Journal`}
        title={post.title}
        dek={dek}
        meta={[publishedDate ?? "Unpublished"]}
        tone={articleProfile.section}
        sectionLabel={articleProfile.sectionLabel}
        readingTime={articleProfile.readingTime}
        identityLink={identityLink}
      />

      {standfirst ? <JournalStandfirst>{standfirst}</JournalStandfirst> : null}

      {heroAsset ? (
        <JournalHeroFigure
          src={getBlogAssetUrl(heroAsset.id)}
          alt={heroAsset.altText}
          width={heroAsset.width ?? 1200}
          height={heroAsset.height ?? 630}
        />
      ) : null}

      <JournalArticleBody>
        <MarkdownProse content={body || normalizedContent} className="blog-article-prose library-prose max-w-none" variant="journal" />
      </JournalArticleBody>
    </JournalPageShell>
  );
}
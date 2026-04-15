import type { Metadata } from "next";

import { getInstanceIdentity } from "@/lib/config/instance";
import { extractDescription } from "./extract-description";

export interface ChapterMetadataInput {
  chapterTitle: string;
  bookTitle: string;
  bookSlug: string;
  chapterSlug: string;
  content: string;
  chapterNumber: number;
  totalChapters: number;
}

// ── Composite builders (single identity lookup, single description extraction) ──

export interface ChapterSeo {
  metadata: Metadata;
  jsonLd: Record<string, unknown>;
}

export function buildChapterSeo(input: ChapterMetadataInput): ChapterSeo {
  const identity = getInstanceIdentity();
  const description = extractDescription(input.content);
  const canonicalUrl = `https://${identity.domain}/library/${input.bookSlug}/${input.chapterSlug}`;

  return {
    metadata: {
      title: `${input.chapterTitle} — ${input.bookTitle} | ${identity.name}`,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: input.chapterTitle,
        description,
        url: canonicalUrl,
        siteName: identity.name,
        type: "article",
        images: [{ url: `https://${identity.domain}${identity.logoPath}` }],
      },
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.chapterTitle,
      description,
      url: canonicalUrl,
      inLanguage: "en",
      isPartOf: { "@type": "Book", name: input.bookTitle },
      author: { "@type": "Organization", name: identity.name },
      publisher: { "@type": "Organization", name: identity.name },
    },
  };
}

export interface LibraryIndexSeo {
  metadata: Metadata;
  jsonLd: Record<string, unknown>;
}

export function buildLibraryIndexSeo(bookCount: number, chapterCount: number): LibraryIndexSeo {
  const identity = getInstanceIdentity();
  const description = `Browse ${bookCount} books and ${chapterCount} chapters documenting the compact, governed AI operator system behind ${identity.name}.`;
  const canonicalUrl = `https://${identity.domain}/library`;

  return {
    metadata: {
      title: `Library — ${bookCount} Books, ${chapterCount} Chapters | ${identity.name}`,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: `${identity.name} Library`,
        description,
        url: canonicalUrl,
        siteName: identity.name,
        type: "website",
        images: [{ url: `https://${identity.domain}${identity.logoPath}` }],
      },
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${identity.name} Library`,
      description: `Browse ${bookCount} books and ${chapterCount} chapters documenting the compact operator system.`,
      url: canonicalUrl,
      numberOfItems: chapterCount,
      provider: { "@type": "Organization", name: identity.name },
    },
  };
}

// ── Backward-compatible wrappers (used by existing callers and Sprint 5 tests) ──

export function buildChapterMetadata(input: ChapterMetadataInput): Metadata {
  return buildChapterSeo(input).metadata;
}

export function buildChapterJsonLd(input: ChapterMetadataInput): Record<string, unknown> {
  return buildChapterSeo(input).jsonLd;
}

export function buildLibraryIndexMetadata(bookCount: number, chapterCount: number): Metadata {
  return buildLibraryIndexSeo(bookCount, chapterCount).metadata;
}

export function buildLibraryIndexJsonLd(bookCount: number, chapterCount: number): Record<string, unknown> {
  return buildLibraryIndexSeo(bookCount, chapterCount).jsonLd;
}

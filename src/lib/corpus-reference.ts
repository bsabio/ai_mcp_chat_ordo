import type { CorpusIndexEntry } from "@/core/use-cases/CorpusIndexInteractor";

import { corpusConfig } from "@/lib/corpus-vocabulary";
import { findCorpusChapterMatch } from "@/lib/corpus-route-aliases";

export interface CanonicalCorpusReference {
  documentSlug: string;
  sectionSlug: string;
  bookSlug: string;
  chapterSlug: string;
  canonicalPath: string;
  resolverPath: string;
}

export interface SafeCorpusReference {
  documentSlug: string | null;
  sectionSlug: string | null;
  bookSlug: string | null;
  chapterSlug: string | null;
  canonicalPath: string | null;
  resolverPath: string | null;
  fallbackSearchPath: string | null;
  fallbackSearchQuery: string | null;
  resolved: boolean;
  resolvedFromAlias: boolean;
}

export function buildCanonicalCorpusReference(documentSlug: string, sectionSlug: string): CanonicalCorpusReference {
  return {
    documentSlug,
    sectionSlug,
    bookSlug: documentSlug,
    chapterSlug: sectionSlug,
    canonicalPath: `${corpusConfig.routeBase}/${documentSlug}/${sectionSlug}`,
    resolverPath: `${corpusConfig.routeBase}/section/${sectionSlug}`,
  };
}

function buildFallbackSearchReference(query: string | null): Pick<SafeCorpusReference, "fallbackSearchPath" | "fallbackSearchQuery"> {
  if (!query) {
    return {
      fallbackSearchPath: null,
      fallbackSearchQuery: null,
    };
  }

  return {
    fallbackSearchPath: corpusConfig.routeBase,
    fallbackSearchQuery: query,
  };
}

function buildResolvedSafeReference(
  documentSlug: string,
  sectionSlug: string,
  resolvedFromAlias: boolean,
): SafeCorpusReference {
  const reference = buildCanonicalCorpusReference(documentSlug, sectionSlug);
  return {
    ...reference,
    fallbackSearchPath: null,
    fallbackSearchQuery: null,
    resolved: true,
    resolvedFromAlias,
  };
}

function findExactCorpusEntry(
  index: CorpusIndexEntry[],
  documentSlug: string,
  sectionSlug: string,
): CorpusIndexEntry | null {
  return index.find(
    (entry) => entry.documentSlug === documentSlug && entry.sectionSlug === sectionSlug,
  ) ?? null;
}

function findUniqueSectionSlugMatch(index: CorpusIndexEntry[], sectionSlug: string): CorpusIndexEntry | null {
  const matches = index.filter((entry) => entry.sectionSlug === sectionSlug);
  return matches.length === 1 ? matches[0] : null;
}

export function resolveCanonicalCorpusReference(
  index: CorpusIndexEntry[],
  requestedDocumentSlug: string,
  requestedSectionSlug: string,
): SafeCorpusReference {
  const normalizedDocumentSlug = requestedDocumentSlug.trim();
  const normalizedSectionSlug = requestedSectionSlug.trim();

  if (!normalizedSectionSlug) {
    return {
      documentSlug: null,
      sectionSlug: null,
      bookSlug: null,
      chapterSlug: null,
      canonicalPath: null,
      resolverPath: null,
      ...buildFallbackSearchReference(normalizedDocumentSlug || null),
      resolved: false,
      resolvedFromAlias: false,
    };
  }

  const exactEntry = normalizedDocumentSlug
    ? findExactCorpusEntry(index, normalizedDocumentSlug, normalizedSectionSlug)
    : null;

  if (exactEntry) {
    return buildResolvedSafeReference(exactEntry.documentSlug, exactEntry.sectionSlug, false);
  }

  const exactSectionEntry = findUniqueSectionSlugMatch(index, normalizedSectionSlug);
  if (exactSectionEntry) {
    return buildResolvedSafeReference(exactSectionEntry.documentSlug, exactSectionEntry.sectionSlug, true);
  }

  const aliasEntry = findCorpusChapterMatch(index, normalizedSectionSlug);
  if (aliasEntry) {
    return buildResolvedSafeReference(aliasEntry.documentSlug, aliasEntry.sectionSlug, true);
  }

  return {
    documentSlug: null,
    sectionSlug: null,
    bookSlug: null,
    chapterSlug: null,
    canonicalPath: null,
    resolverPath: null,
    ...buildFallbackSearchReference(normalizedSectionSlug || normalizedDocumentSlug || null),
    resolved: false,
    resolvedFromAlias: false,
  };
}
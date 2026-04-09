import { corpusConfig } from "@/lib/corpus-vocabulary";

export interface CanonicalCorpusReference {
  documentSlug: string;
  sectionSlug: string;
  bookSlug: string;
  chapterSlug: string;
  canonicalPath: string;
  resolverPath: string;
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
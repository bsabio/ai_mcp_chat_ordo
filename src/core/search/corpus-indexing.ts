import { createHash } from "node:crypto";

import type { DocumentChunkMetadata } from "./ports/Chunker";

export const CORPUS_INDEX_SIGNATURE_VERSION = "corpus-index-v2";

function normalizeCorpusMetadata(metadata: DocumentChunkMetadata) {
  return {
    sourceType: metadata.sourceType,
    documentSlug: metadata.documentSlug ?? null,
    sectionSlug: metadata.sectionSlug ?? null,
    documentTitle: metadata.documentTitle ?? null,
    documentId: metadata.documentId ?? null,
    sectionTitle: metadata.sectionTitle ?? null,
    sectionFirstSentence: metadata.sectionFirstSentence ?? null,
    bookSlug: metadata.bookSlug ?? null,
    chapterSlug: metadata.chapterSlug ?? null,
    bookTitle: metadata.bookTitle ?? null,
    bookNumber: metadata.bookNumber ?? null,
    chapterTitle: metadata.chapterTitle ?? null,
    chapterFirstSentence: metadata.chapterFirstSentence ?? null,
  };
}

export function buildCorpusIndexContentHash(
  content: string,
  metadata: DocumentChunkMetadata,
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      signatureVersion: CORPUS_INDEX_SIGNATURE_VERSION,
      content,
      metadata: normalizeCorpusMetadata(metadata),
    }))
    .digest("hex");
}
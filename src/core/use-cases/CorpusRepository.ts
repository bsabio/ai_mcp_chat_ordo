import type { Document, Section } from "../entities/corpus";

export interface CorpusQuery {
  getAllDocuments(): Promise<Document[]>;
  getDocument(slug: string): Promise<Document | null>;
}

export interface SectionQuery {
  getSectionsByDocument(documentSlug: string): Promise<Section[]>;
  getAllSections(): Promise<Section[]>;
  getSection(documentSlug: string, sectionSlug: string): Promise<Section>;
}

export interface CorpusRepository extends CorpusQuery, SectionQuery {}

export interface LegacyBookQuery {
  getAllBooks(): Promise<Document[]>;
  getBook(slug: string): Promise<Document | null>;
}

export interface LegacyChapterQuery {
  getChaptersByBook(bookSlug: string): Promise<Section[]>;
  getAllChapters(): Promise<Section[]>;
  getChapter(bookSlug: string, chapterSlug: string): Promise<Section>;
}

export type CorpusCompatibleRepository = CorpusRepository | (LegacyBookQuery & LegacyChapterQuery);

export function asCorpusRepository(repo: CorpusCompatibleRepository): CorpusRepository {
  if (
    "getAllDocuments" in repo &&
    "getDocument" in repo &&
    "getSectionsByDocument" in repo &&
    "getAllSections" in repo &&
    "getSection" in repo
  ) {
    return repo;
  }

  return {
    getAllDocuments: () => repo.getAllBooks(),
    getDocument: (slug: string) => repo.getBook(slug),
    getSectionsByDocument: (documentSlug: string) => repo.getChaptersByBook(documentSlug),
    getAllSections: () => repo.getAllChapters(),
    getSection: (documentSlug: string, sectionSlug: string) => repo.getChapter(documentSlug, sectionSlug),
  };
}
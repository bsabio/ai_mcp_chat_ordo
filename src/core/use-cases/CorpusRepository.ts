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
import type { UseCase } from "../common/UseCase";
import type { CorpusRepository } from "./CorpusRepository";

export interface CorpusIndexEntry {
  documentSlug: string;
  documentTitle: string;
  documentId: string;
  sectionSlug: string;
  sectionTitle: string;
  contributors: string[];
  supplements: string[];
  headings: string[];
  contentPreview: string;
  filePath: string;
  bookSlug: string;
  bookTitle: string;
  bookNumber: string;
  chapterSlug: string;
  chapterTitle: string;
  practitioners: string[];
  checklistItems: string[];
}

export class CorpusIndexInteractor implements UseCase<void, CorpusIndexEntry[]> {
  constructor(private corpusRepository: CorpusRepository) {}

  async execute(): Promise<CorpusIndexEntry[]> {
    const documents = await this.corpusRepository.getAllDocuments();
    const sections = await this.corpusRepository.getAllSections();

    return sections.map((section) => {
      const document = documents.find((candidate) => candidate.slug === section.documentSlug);
      const documentId = document?.number || "";
      const documentTitle = document?.title || "";
      const documentSlug = document?.slug || section.documentSlug;

      return {
        documentSlug,
        documentTitle,
        documentId,
        sectionSlug: section.sectionSlug,
        sectionTitle: section.title,
        contributors: section.contributors,
        supplements: section.supplements,
        headings: section.headings,
        contentPreview: section.content.slice(0, 300).replace(/\n/g, " ").trim(),
        filePath: "",
        bookSlug: documentSlug,
        bookTitle: documentTitle,
        bookNumber: documentId,
        chapterSlug: section.sectionSlug,
        chapterTitle: section.title,
        practitioners: section.contributors,
        checklistItems: section.supplements,
      };
    });
  }
}
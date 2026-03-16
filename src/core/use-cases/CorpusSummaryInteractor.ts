import type { UseCase } from "../common/UseCase";
import {
  asCorpusRepository,
  type CorpusCompatibleRepository,
  type CorpusRepository,
} from "./CorpusRepository";

export interface CorpusSummary {
  id: string;
  title: string;
  slug: string;
  sectionCount: number;
  sections: string[];
  sectionSlugs: string[];
  number?: string;
  chapterCount?: number;
  chapters?: string[];
  chapterSlugs?: string[];
}

export class CorpusSummaryInteractor implements UseCase<void, CorpusSummary[]> {
  private readonly corpusRepository: CorpusRepository;

  constructor(repo: CorpusCompatibleRepository) {
    this.corpusRepository = asCorpusRepository(repo);
  }

  async execute(): Promise<CorpusSummary[]> {
    const documents = await this.corpusRepository.getAllDocuments();
    const sections = await this.corpusRepository.getAllSections();

    return documents.map((document) => {
      const documentSections = sections.filter((section) => section.documentSlug === document.slug);
      return {
        id: document.id ?? document.number,
        title: document.title,
        slug: document.slug,
        sectionCount: documentSections.length,
        sections: documentSections.map((section) => section.title),
        sectionSlugs: documentSections.map((section) => section.sectionSlug),
        number: document.number,
        chapterCount: documentSections.length,
        chapters: documentSections.map((section) => section.title),
        chapterSlugs: documentSections.map((section) => section.sectionSlug),
      };
    });
  }
}
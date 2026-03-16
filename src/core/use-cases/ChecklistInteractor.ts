import type { UseCase } from "../common/UseCase";
import {
  asCorpusRepository,
  type CorpusCompatibleRepository,
  type CorpusRepository,
} from "./CorpusRepository";
import type { Checklist } from "../entities/library";

export interface ChecklistRequest {
  bookSlug?: string;
}

export class ChecklistInteractor implements UseCase<ChecklistRequest, Checklist[]> {
  private readonly corpusRepository: CorpusRepository;

  constructor(repo: CorpusCompatibleRepository) {
    this.corpusRepository = asCorpusRepository(repo);
  }

  async execute(request: ChecklistRequest): Promise<Checklist[]> {
    const sections = await this.corpusRepository.getAllSections();
    const documents = await this.corpusRepository.getAllDocuments();

    const filteredSections = request.bookSlug
      ? sections.filter((section) => section.documentSlug === request.bookSlug)
      : sections;

    return filteredSections
      .filter((section) => section.supplements.length > 0)
      .map((section) => {
        const document = documents.find((candidate) => candidate.slug === section.documentSlug);
        return {
          bookTitle: document ? `${document.number}. ${document.title}` : section.documentSlug,
          chapterTitle: section.title,
          items: section.supplements,
        };
      });
  }
}

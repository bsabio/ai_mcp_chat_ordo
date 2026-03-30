import type { UseCase } from "../common/UseCase";
import { canAccessAudience } from "@/lib/access/content-access";
import type { RoleName } from "../entities/user";
import type { CorpusRepository } from "./CorpusRepository";
import type { Checklist } from "../entities/library";

export interface ChecklistRequest {
  bookSlug?: string;
  role?: RoleName;
}

export class ChecklistInteractor implements UseCase<ChecklistRequest, Checklist[]> {
  private readonly corpusRepository: CorpusRepository;

  constructor(repo: CorpusRepository) {
    this.corpusRepository = repo;
  }

  async execute(request: ChecklistRequest): Promise<Checklist[]> {
    const sections = await this.corpusRepository.getAllSections();
    const documents = await this.corpusRepository.getAllDocuments();

    const roleVisibleSections = request.role
      ? sections.filter((section) => canAccessAudience(section.audience, request.role as RoleName))
      : sections;

    const filteredSections = request.bookSlug
      ? roleVisibleSections.filter((section) => section.documentSlug === request.bookSlug)
      : roleVisibleSections;

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

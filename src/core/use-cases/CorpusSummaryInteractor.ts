import type { UseCase } from "../common/UseCase";
import { canAccessAudience, type ContentAudience } from "@/lib/access/content-access";
import type { RoleName } from "../entities/user";
import type { CorpusRepository } from "./CorpusRepository";

export interface CorpusSummary {
  id: string;
  title: string;
  slug: string;
  audience: ContentAudience;
  sectionCount: number;
  sections: string[];
  sectionSlugs: string[];
  number?: string;
  chapterCount?: number;
  chapters?: string[];
  chapterSlugs?: string[];
}

export class CorpusSummaryInteractor implements UseCase<{ role?: RoleName } | undefined, CorpusSummary[]> {
  private readonly corpusRepository: CorpusRepository;

  constructor(repo: CorpusRepository) {
    this.corpusRepository = repo;
  }

  async execute(request?: { role?: RoleName }): Promise<CorpusSummary[]> {
    const documents = await this.corpusRepository.getAllDocuments();
    const sections = await this.corpusRepository.getAllSections();
    const role = request?.role;

    return documents.flatMap((document) => {
      const documentSections = sections.filter((section) => section.documentSlug === document.slug);
      const visibleSections = role
        ? documentSections.filter((section) => canAccessAudience(section.audience, role))
        : documentSections;

      if (role && visibleSections.length === 0) {
        return [];
      }

      return {
        id: document.id ?? document.number,
        title: document.title,
        slug: document.slug,
        audience: document.audience,
        sectionCount: visibleSections.length,
        sections: visibleSections.map((section) => section.title),
        sectionSlugs: visibleSections.map((section) => section.sectionSlug),
        number: document.number,
        chapterCount: visibleSections.length,
        chapters: visibleSections.map((section) => section.title),
        chapterSlugs: visibleSections.map((section) => section.sectionSlug),
      };
    });
  }
}
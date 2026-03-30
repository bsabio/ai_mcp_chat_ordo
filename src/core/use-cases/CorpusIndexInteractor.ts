import type { UseCase } from "../common/UseCase";
import { canAccessAudience, type ContentAudience } from "@/lib/access/content-access";
import type { RoleName } from "../entities/user";
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
  audience: ContentAudience;
}

export class CorpusIndexInteractor implements UseCase<{ role?: RoleName } | undefined, CorpusIndexEntry[]> {
  constructor(private corpusRepository: CorpusRepository) {}

  async execute(request?: { role?: RoleName }): Promise<CorpusIndexEntry[]> {
    const documents = await this.corpusRepository.getAllDocuments();
    const sections = await this.corpusRepository.getAllSections();
    const role = request?.role;

    return sections.flatMap((section) => {
      if (role && !canAccessAudience(section.audience, role)) {
        return [];
      }

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
        audience: section.audience,
      };
    });
  }
}
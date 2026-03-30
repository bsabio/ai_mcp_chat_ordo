import type { UseCase } from "../common/UseCase";
import { canAccessAudience } from "@/lib/access/content-access";
import type { RoleName } from "../entities/user";
import type { CorpusRepository } from "./CorpusRepository";
import { ContentAccessDeniedError } from "../entities/errors";

export interface GetChapterRequest {
  bookSlug: string;
  chapterSlug: string;
  role?: RoleName;
}

export interface ChapterDetails {
  title: string;
  content: string;
  bookTitle: string;
}

export class GetChapterInteractor implements UseCase<GetChapterRequest, ChapterDetails | null> {
  private readonly corpusRepository: CorpusRepository;

  constructor(repo: CorpusRepository) {
    this.corpusRepository = repo;
  }

  async execute(request: GetChapterRequest): Promise<ChapterDetails | null> {
    const section = await this.corpusRepository.getSection(
      request.bookSlug,
      request.chapterSlug,
    );
    if (!section) return null;

    if (request.role && !canAccessAudience(section.audience, request.role)) {
      throw new ContentAccessDeniedError(
        `Access denied for section ${request.bookSlug}/${request.chapterSlug}`,
        section.audience,
      );
    }

    const document = await this.corpusRepository.getDocument(request.bookSlug);

    return {
      title: section.title,
      content: section.content,
      bookTitle: document ? `${document.number}. ${document.title}` : "",
    };
  }
}

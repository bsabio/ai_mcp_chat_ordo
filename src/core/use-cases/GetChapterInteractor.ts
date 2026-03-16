import type { UseCase } from "../common/UseCase";
import {
  asCorpusRepository,
  type CorpusCompatibleRepository,
  type CorpusRepository,
} from "./CorpusRepository";

export interface GetChapterRequest {
  bookSlug: string;
  chapterSlug: string;
}

export interface ChapterDetails {
  title: string;
  content: string;
  bookTitle: string;
}

export class GetChapterInteractor implements UseCase<GetChapterRequest, ChapterDetails | null> {
  private readonly corpusRepository: CorpusRepository;

  constructor(repo: CorpusCompatibleRepository) {
    this.corpusRepository = asCorpusRepository(repo);
  }

  async execute(request: GetChapterRequest): Promise<ChapterDetails | null> {
    const section = await this.corpusRepository.getSection(
      request.bookSlug,
      request.chapterSlug,
    );
    if (!section) return null;

    const document = await this.corpusRepository.getDocument(request.bookSlug);

    return {
      title: section.title,
      content: section.content,
      bookTitle: document ? `${document.number}. ${document.title}` : "",
    };
  }
}

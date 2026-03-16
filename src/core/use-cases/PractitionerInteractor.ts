import type { UseCase } from "../common/UseCase";
import {
  asCorpusRepository,
  type CorpusCompatibleRepository,
  type CorpusRepository,
} from "./CorpusRepository";
import type { Book, Practitioner } from "../entities/library";

export interface PractitionerRequest {
  query?: string;
}

export class PractitionerInteractor implements UseCase<PractitionerRequest, Practitioner[]> {
  private readonly corpusRepository: CorpusRepository;

  constructor(repo: CorpusCompatibleRepository) {
    this.corpusRepository = asCorpusRepository(repo);
  }

  async execute(request: PractitionerRequest): Promise<Practitioner[]> {
    const sections = await this.corpusRepository.getAllSections();
    const documents = await this.corpusRepository.getAllDocuments();
    
    const practitionerMap = new Map<string, { books: Set<string>; chapters: Set<string>; bookData: Book[] }>();

    for (const section of sections) {
      for (const name of section.contributors) {
        const key = name.toLowerCase();
        if (request.query && !key.includes(request.query.toLowerCase())) continue;

        let record = practitionerMap.get(key);
        if (!record) {
          record = { books: new Set(), chapters: new Set(), bookData: [] };
          practitionerMap.set(key, record);
        }
        
        const document = documents.find((candidate) => candidate.slug === section.documentSlug);
        if (document) {
          record.books.add(document.slug);
          if (!record.bookData.find((candidate) => candidate.slug === document.slug)) {
            record.bookData.push(document);
          }
        }
        record.chapters.add(JSON.stringify({ slug: section.sectionSlug, title: section.title }));
      }
    }

    return Array.from(practitionerMap.entries())
      .map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        books: value.bookData,
        chapters: Array.from(value.chapters).map((chapter) => JSON.parse(chapter) as Practitioner["chapters"][number]),
      }))
      .sort((a, b) => b.chapters.length - a.chapters.length);
  }
}

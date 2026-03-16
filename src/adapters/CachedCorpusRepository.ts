import type { Document, Section } from "@/core/entities/corpus";
import {
	asCorpusRepository,
	type CorpusCompatibleRepository,
	type CorpusRepository,
} from "@/core/use-cases/CorpusRepository";

export class CachedCorpusRepository implements CorpusRepository {
	private allDocumentsCache: Document[] | null = null;
	private allSectionsCache: Section[] | null = null;
	private documentCache = new Map<string, Document | null>();
	private sectionsByDocumentCache = new Map<string, Section[]>();
	private sectionCache = new Map<string, Section>();

	private readonly inner: CorpusRepository;

	constructor(inner: CorpusCompatibleRepository) {
		this.inner = asCorpusRepository(inner);
	}

	clearCache(): void {
		this.allDocumentsCache = null;
		this.allSectionsCache = null;
		this.documentCache.clear();
		this.sectionsByDocumentCache.clear();
		this.sectionCache.clear();
	}

	async getAllDocuments(): Promise<Document[]> {
		if (!this.allDocumentsCache) {
			this.allDocumentsCache = await this.inner.getAllDocuments();
		}
		return this.allDocumentsCache;
	}

	async getDocument(slug: string): Promise<Document | null> {
		if (this.documentCache.has(slug)) {
			return this.documentCache.get(slug) ?? null;
		}

		const document = await this.inner.getDocument(slug);
		this.documentCache.set(slug, document);
		return document;
	}

	async getSectionsByDocument(documentSlug: string): Promise<Section[]> {
		if (this.sectionsByDocumentCache.has(documentSlug)) {
			return this.sectionsByDocumentCache.get(documentSlug) ?? [];
		}

		const sections = await this.inner.getSectionsByDocument(documentSlug);
		this.sectionsByDocumentCache.set(documentSlug, sections);
		return sections;
	}

	async getAllSections(): Promise<Section[]> {
		if (!this.allSectionsCache) {
			this.allSectionsCache = await this.inner.getAllSections();
		}
		return this.allSectionsCache;
	}

	async getSection(documentSlug: string, sectionSlug: string): Promise<Section> {
		const key = `${documentSlug}/${sectionSlug}`;
		if (this.sectionCache.has(key)) {
			const cached = this.sectionCache.get(key);
			if (cached) {
				return cached;
			}
		}

		const section = await this.inner.getSection(documentSlug, sectionSlug);
		this.sectionCache.set(key, section);
		return section;
	}

	async getAllBooks(): Promise<Document[]> {
		return this.getAllDocuments();
	}

	async getBook(slug: string): Promise<Document | null> {
		return this.getDocument(slug);
	}

	async getChaptersByBook(bookSlug: string): Promise<Section[]> {
		return this.getSectionsByDocument(bookSlug);
	}

	async getAllChapters(): Promise<Section[]> {
		return this.getAllSections();
	}

	async getChapter(bookSlug: string, chapterSlug: string): Promise<Section> {
		return this.getSection(bookSlug, chapterSlug);
	}
}
import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import type { CorpusRepository } from "../core/use-cases/CorpusRepository";
import type { Document } from "../core/entities/corpus";
import { Section } from "../core/entities/corpus";
import { ResourceNotFoundError } from "../core/entities/errors";
import { ExtractPractitioners } from "../core/use-cases/ExtractPractitioners";
import { AnalyzeChapterChecklist } from "../core/use-cases/AnalyzeChapterChecklist";

export const DEFAULT_DOCS_DIR = "docs";
const CORPUS_DIR = "_corpus";
const VALID_DOMAINS = new Set([
	"teaching",
	"sales",
	"customer-service",
	"reference",
	"internal",
]);

interface DocumentMeta {
	slug: string;
	title: string;
	shortTitle: string;
	number: string;
	sectionsDir: string;
}

interface DocumentManifest {
	slug: string;
	title: string;
	number: string;
	sortOrder: number;
	domain: string[];
	tags?: string[];
}

export class FileSystemCorpusRepository implements CorpusRepository {
	private readonly contributorExtractor = new ExtractPractitioners();
	private readonly supplementAnalyzer = new AnalyzeChapterChecklist();
	private discoveredDocuments: DocumentMeta[] | null = null;

	constructor(
		private readonly docsDir: string = path.join(
			process.cwd(),
			DEFAULT_DOCS_DIR,
		),
	) {}

	private async discoverDocuments(): Promise<DocumentMeta[]> {
		if (this.discoveredDocuments) return this.discoveredDocuments;

		const corpusDir = path.join(this.docsDir, CORPUS_DIR);
		let entries: Dirent[];
		try {
			entries = await fs.readdir(corpusDir, { withFileTypes: true });
		} catch {
			return [];
		}

		const documentsWithOrder: Array<{ meta: DocumentMeta; sortOrder: number }> = [];
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			try {
				const raw = await fs.readFile(
					path.join(corpusDir, entry.name, "book.json"),
					"utf-8",
				);
				const manifest: DocumentManifest = JSON.parse(raw);
				if (typeof manifest.slug !== "string" || !manifest.slug) continue;
				if (typeof manifest.title !== "string" || !manifest.title) continue;
				if (typeof manifest.number !== "string" || !manifest.number) continue;
				if (typeof manifest.sortOrder !== "number") continue;
				if (!Array.isArray(manifest.domain) || manifest.domain.length === 0) continue;
				if (manifest.domain.some((domain: string) => !VALID_DOMAINS.has(domain))) continue;
				if (entry.name !== manifest.slug) {
					console.warn(
						`Slug mismatch: dir "${entry.name}" vs slug "${manifest.slug}" — skipping`,
					);
					continue;
				}
				documentsWithOrder.push({
					meta: {
						slug: manifest.slug,
						title: manifest.title,
						shortTitle: manifest.title,
						number: manifest.number,
						sectionsDir: path.join(CORPUS_DIR, manifest.slug, "chapters"),
					},
					sortOrder: manifest.sortOrder,
				});
			} catch {
				// No book.json or invalid JSON — skip this directory.
			}
		}

		this.discoveredDocuments = documentsWithOrder
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map(({ meta }) => meta);
		return this.discoveredDocuments;
	}

	clearDiscoveryCache(): void {
		this.discoveredDocuments = null;
	}

	async getAllDocuments(): Promise<Document[]> {
		const documents = await this.discoverDocuments();
		return documents.map((document) => ({
			slug: document.slug,
			title: document.title,
			number: document.number,
			id: document.number,
		}));
	}

	async getDocument(slug: string): Promise<Document | null> {
		const documents = await this.discoverDocuments();
		const document = documents.find((candidate) => candidate.slug === slug);
		if (!document) return null;
		return {
			slug: document.slug,
			title: document.title,
			number: document.number,
			id: document.number,
		};
	}

	async getSectionsByDocument(documentSlug: string): Promise<Section[]> {
		const documents = await this.discoverDocuments();
		const documentMeta = documents.find((candidate) => candidate.slug === documentSlug);
		if (!documentMeta) {
			throw new ResourceNotFoundError(`Document not found: ${documentSlug}`);
		}

		const sectionsDir = path.join(this.docsDir, documentMeta.sectionsDir);

		try {
			const files = await fs.readdir(sectionsDir);
			const markdownFiles = files.filter((filename) => filename.endsWith(".md")).sort();

			const sections: Section[] = [];
			for (const filename of markdownFiles) {
				const slug = filename.replace(/\.md$/, "");
				const content = await fs.readFile(
					path.join(sectionsDir, filename),
					"utf-8",
				);
				sections.push(this.parseSection(documentMeta.slug, slug, content));
			}
			return sections;
		} catch {
			throw new ResourceNotFoundError(`Failed to read sections for document: ${documentSlug}`);
		}
	}

	async getAllSections(): Promise<Section[]> {
		const documents = await this.getAllDocuments();
		const allSections: Section[] = [];
		for (const document of documents) {
			const sections = await this.getSectionsByDocument(document.slug);
			allSections.push(...sections);
		}
		return allSections;
	}

	async getSection(documentSlug: string, sectionSlug: string): Promise<Section> {
		const documents = await this.discoverDocuments();
		const documentMeta = documents.find((candidate) => candidate.slug === documentSlug);
		if (!documentMeta) {
			throw new ResourceNotFoundError(`Document not found: ${documentSlug}`);
		}

		const filepath = path.join(
			this.docsDir,
			documentMeta.sectionsDir,
			`${sectionSlug}.md`,
		);
		try {
			const content = await fs.readFile(filepath, "utf-8");
			return this.parseSection(documentSlug, sectionSlug, content);
		} catch {
			throw new ResourceNotFoundError(`Section not found: ${sectionSlug}`);
		}
	}

	private parseSection(
		documentSlug: string,
		sectionSlug: string,
		content: string,
	): Section {
		const titleMatch = content.match(/^#\s+(.*)/m);
		const title = titleMatch ? titleMatch[1].trim() : sectionSlug;

		const contributors = this.contributorExtractor.execute(content);
		const supplements = this.supplementAnalyzer.execute(content);

		const headings = [...content.matchAll(/^##\s+(.*)/gm)].map((match) =>
			match[1].trim(),
		);

		return new Section(
			documentSlug,
			sectionSlug,
			title,
			content,
			contributors,
			supplements,
			headings,
		);
	}
}
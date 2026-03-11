import { ToolCommand } from "../ToolCommand";
import { 
  searchBooks, 
  getChapterFull, 
  getChecklists, 
  getPractitioners, 
  getBookSummaries 
} from "@/lib/book-library";

export class SearchBooksCommand implements ToolCommand<{ query: string; max_results?: number }, string> {
  async execute({ query, max_results = 5 }: { query: string; max_results?: number }) {
    const results = await searchBooks(query, Math.min(max_results, 15));
    if (results.length === 0) return `No results found for "${query}".`;
    return JSON.stringify(results, null, 2);
  }
}

export class GetChapterCommand implements ToolCommand<{ book_slug: string; chapter_slug: string }, string> {
  async execute({ book_slug, chapter_slug }: { book_slug: string; chapter_slug: string }) {
    const chapter = await getChapterFull(book_slug, chapter_slug);
    if (!chapter) return `Chapter not found: ${book_slug}/${chapter_slug}.`;
    
    const content = chapter.content.length > 4000 
      ? chapter.content.slice(0, 4000) + "\n\n[... truncated ...]" 
      : chapter.content;
      
    return `# ${chapter.book} — ${chapter.title}\n\n${content}`;
  }
}

export class GetChecklistCommand implements ToolCommand<{ book_slug?: string }, string> {
  async execute({ book_slug }: { book_slug?: string }) {
    const checklists = await getChecklists(book_slug);
    if (checklists.length === 0) return "No checklists found.";
    return checklists.map(cl => `## ${cl.book} — ${cl.chapter}\n${cl.items.map(i => `- ${i}`).join("\n")}`).join("\n\n");
  }
}

export class ListPractitionersCommand implements ToolCommand<{ query?: string }, string> {
  async execute({ query }: { query?: string }) {
    const practitioners = await getPractitioners(query);
    if (practitioners.length === 0) return "No practitioners found.";
    return practitioners.slice(0, 30).map(p => `**${p.name}** — appears in ${p.books.join(", ")} (${p.chapters.join("; ")})`).join("\n");
  }
}

export class GetBookSummaryCommand implements ToolCommand<{}, string> {
  async execute() {
    const summaries = await getBookSummaries();
    return summaries.map(s => {
      const chapterList = s.chapters.map((title, i) => {
        const slug = s.chapterSlugs?.[i];
        return slug ? `- ${title} (slug: \`${slug}\`)` : `- ${title}`;
      }).join("\n");
      return `### Book ${s.number}: ${s.title} (book_slug: \`${s.slug}\`)\n${s.chapterCount} chapters:\n${chapterList}`;
    }).join("\n\n");
  }
}

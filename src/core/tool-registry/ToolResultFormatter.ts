import type { ToolExecutionContext } from "./ToolExecutionContext";

export interface ToolResultFormatter {
  format(toolName: string, result: unknown, context: ToolExecutionContext): unknown;
}

export class RoleAwareSearchFormatter implements ToolResultFormatter {
  format(toolName: string, result: unknown, context: ToolExecutionContext): unknown {
    if (toolName !== "search_corpus") return result;
    if (!Array.isArray(result)) return result;
    if (context.role === "ANONYMOUS") {
      return result.map((r: Record<string, unknown>) => ({
        document: r.document ?? r.book,
        documentId: r.documentId ?? r.bookNumber,
        section: r.section ?? r.chapterTitle ?? r.chapter,
        relevance: r.relevance,
        matchSection: r.matchSection ?? null,
        book: r.book,
        bookNumber: r.bookNumber,
        chapter: r.chapterTitle ?? r.chapter,
      }));
    }
    return result;
  }
}

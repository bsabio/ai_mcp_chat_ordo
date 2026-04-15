export type ChunkLevel = "document" | "section" | "passage";

export type ChunkBoundarySource =
  | "document_start"
  | "h2_heading"
  | "h3_heading"
  | "paragraph_break"
  | "line_break"
  | "inline_offset";

export interface SearchChunkMetadata {
  chunkId: string | null;
  chunkLevel: ChunkLevel | null;
  localChunkIndex: number | null;
  localChunkCount: number | null;
  parentChunkId: string | null;
  previousChunkId: string | null;
  nextChunkId: string | null;
  boundarySource: ChunkBoundarySource | null;
  conceptKeywords: string[];
}

/** Discriminated union for type-safe, source-specific chunk metadata (GB-1) */
export interface DocumentChunkMetadata {
  sourceType: string;
  documentSlug?: string;
  sectionSlug?: string;
  documentTitle?: string;
  documentId?: string;
  sectionTitle?: string;
  sectionFirstSentence?: string;
  contributors?: string[];
  supplements?: string[];
  bookSlug?: string;
  chapterSlug?: string;
  bookTitle?: string;
  bookNumber?: string;
  chapterTitle?: string;
  chapterFirstSentence?: string;
  practitioners?: string[];
  checklistItems?: string[];
  chunkId?: string;
  chunkLevel?: ChunkLevel;
  localChunkIndex?: number;
  localChunkCount?: number;
  parentChunkId?: string | null;
  previousChunkId?: string | null;
  nextChunkId?: string | null;
  boundarySource?: ChunkBoundarySource;
  conceptKeywords?: string[];
}

export interface ConversationMetadata {
  sourceType: "conversation";
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  turnIndex: number;
}

export type ChunkMetadata = DocumentChunkMetadata | ConversationMetadata;

export interface Chunk {
  content: string; // the raw text (for display)
  embeddingInput: string; // the context-prefixed text (for embedding)
  level: ChunkLevel;
  heading: string | null; // section heading, if applicable
  startOffset: number; // char offset in source document
  endOffset: number;
  metadata: ChunkMetadata; // discriminated union — no Record<string, unknown>
}

export interface ChunkerOptions {
  maxChunkWords: number; // default 400
  minChunkWords: number; // default 50
}

export interface Chunker {
  chunk(
    sourceId: string,
    content: string,
    metadata: ChunkMetadata,
    options?: ChunkerOptions,
  ): Chunk[];
}

export type BookChunkMetadata = DocumentChunkMetadata;

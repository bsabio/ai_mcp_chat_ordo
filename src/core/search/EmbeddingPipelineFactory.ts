import type { Embedder } from "./ports/Embedder";
import type { VectorStore } from "./ports/VectorStore";
import type { Chunker } from "./ports/Chunker";
import { MarkdownChunker } from "./MarkdownChunker";
import { ConversationChunker } from "./ConversationChunker";
import { ChangeDetector } from "./ChangeDetector";
import { EmbeddingPipeline } from "./EmbeddingPipeline";

type ChunkerFactory = () => Chunker;

/**
 * Factory for constructing EmbeddingPipeline instances per source type (GoF-2).
 * Encapsulates chunker selection — callers specify intent, not implementation.
 */
export class EmbeddingPipelineFactory {
  constructor(
    private embedder: Embedder,
    private vectorStore: VectorStore,
    private modelVersion: string,
    private chunkerRegistry: Map<string, ChunkerFactory> = new Map<string, ChunkerFactory>([
      ["markdown", () => new MarkdownChunker()],
      ["conversation", () => new ConversationChunker()],
    ]),
  ) {}

  createForSource(
    sourceType: string,
  ): EmbeddingPipeline {
    const factory = this.chunkerRegistry.get(sourceType)
      ?? this.chunkerRegistry.get("markdown")
      ?? (() => new MarkdownChunker());
    const chunker = factory();
    const changeDetector = new ChangeDetector(this.vectorStore);
    return new EmbeddingPipeline(
      chunker,
      this.embedder,
      this.vectorStore,
      changeDetector,
      this.modelVersion,
    );
  }
}

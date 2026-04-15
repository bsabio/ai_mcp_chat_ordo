import type {
  ChunkBoundarySource,
  ChunkLevel,
  DocumentChunkMetadata,
  SearchChunkMetadata,
} from "./ports/Chunker";

const VALID_CHUNK_LEVELS = new Set<ChunkLevel>(["document", "section", "passage"]);
const VALID_BOUNDARY_SOURCES = new Set<ChunkBoundarySource>([
  "document_start",
  "h2_heading",
  "h3_heading",
  "paragraph_break",
  "line_break",
  "inline_offset",
]);

function isChunkLevel(value: unknown): value is ChunkLevel {
  return typeof value === "string" && VALID_CHUNK_LEVELS.has(value as ChunkLevel);
}

function isBoundarySource(value: unknown): value is ChunkBoundarySource {
  return typeof value === "string" && VALID_BOUNDARY_SOURCES.has(value as ChunkBoundarySource);
}

export function toSearchChunkMetadata(metadata: unknown): SearchChunkMetadata | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const documentMetadata = metadata as DocumentChunkMetadata;
  if (documentMetadata.sourceType === "conversation") {
    return null;
  }

  return {
    chunkId: typeof documentMetadata.chunkId === "string" ? documentMetadata.chunkId : null,
    chunkLevel: isChunkLevel(documentMetadata.chunkLevel) ? documentMetadata.chunkLevel : null,
    localChunkIndex: typeof documentMetadata.localChunkIndex === "number" ? documentMetadata.localChunkIndex : null,
    localChunkCount: typeof documentMetadata.localChunkCount === "number" ? documentMetadata.localChunkCount : null,
    parentChunkId: typeof documentMetadata.parentChunkId === "string" ? documentMetadata.parentChunkId : null,
    previousChunkId: typeof documentMetadata.previousChunkId === "string" ? documentMetadata.previousChunkId : null,
    nextChunkId: typeof documentMetadata.nextChunkId === "string" ? documentMetadata.nextChunkId : null,
    boundarySource: isBoundarySource(documentMetadata.boundarySource) ? documentMetadata.boundarySource : null,
    conceptKeywords: Array.isArray(documentMetadata.conceptKeywords)
      ? documentMetadata.conceptKeywords.filter((value): value is string => typeof value === "string")
      : [],
  };
}
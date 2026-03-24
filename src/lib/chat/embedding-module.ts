import { LocalEmbedder } from "@/adapters/LocalEmbedder";
import { SQLiteVectorStore } from "@/adapters/SQLiteVectorStore";
import { EmbeddingPipelineFactory } from "@/core/search/EmbeddingPipelineFactory";
import type { EmbeddingPipeline } from "@/core/search/EmbeddingPipeline";
import { getDb } from "@/lib/db";
import { corpusConfig } from "@/lib/corpus-vocabulary";

const MODEL_VERSION = "all-MiniLM-L6-v2@1.0";

export function getEmbeddingPipelineFactory(): EmbeddingPipelineFactory {
  return new EmbeddingPipelineFactory(
    new LocalEmbedder(),
    new SQLiteVectorStore(getDb()),
    MODEL_VERSION,
  );
}

export function getBookPipeline(): EmbeddingPipeline {
  return getEmbeddingPipelineFactory().createForSource(corpusConfig.sourceType);
}

export function getCorpusPipeline(): EmbeddingPipeline {
  return getEmbeddingPipelineFactory().createForSource(corpusConfig.sourceType);
}

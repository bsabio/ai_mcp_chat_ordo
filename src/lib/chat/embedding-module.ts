import { localEmbedder } from "@/adapters/LocalEmbedder";
import { getVectorStore } from "@/adapters/RepositoryFactory";
import { EmbeddingPipelineFactory } from "@/core/search/EmbeddingPipelineFactory";
import type { EmbeddingPipeline } from "@/core/search/EmbeddingPipeline";

import { corpusConfig } from "@/lib/corpus-vocabulary";

const MODEL_VERSION = "all-MiniLM-L6-v2@1.0";

export function getEmbeddingPipelineFactory(): EmbeddingPipelineFactory {
  return new EmbeddingPipelineFactory(
    localEmbedder,
    getVectorStore(),
    MODEL_VERSION,
  );
}

export function getBookPipeline(): EmbeddingPipeline {
  return getEmbeddingPipelineFactory().createForSource(corpusConfig.sourceType);
}

export function getCorpusPipeline(): EmbeddingPipeline {
  return getEmbeddingPipelineFactory().createForSource(corpusConfig.sourceType);
}

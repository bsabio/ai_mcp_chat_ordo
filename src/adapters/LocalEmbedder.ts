import type { Embedder } from "@/core/search/ports/Embedder";

type PipelineOutput = { data: ArrayLike<number> };
type Pipeline = (text: string | string[], options?: Record<string, unknown>) => Promise<PipelineOutput | PipelineOutput[]>;

function isPipelineOutputArray(output: PipelineOutput | PipelineOutput[]): output is PipelineOutput[] {
  return Array.isArray(output);
}

function hasBatchShape(output: PipelineOutput | PipelineOutput[], batchSize: number): output is PipelineOutput & { dims: number[] } {
  return !Array.isArray(output)
    && "dims" in output
    && Array.isArray((output as { dims?: unknown }).dims)
    && ((output as { dims: number[] }).dims[0] === batchSize);
}

class LocalEmbedder implements Embedder {
  private pipe: Pipeline | null = null;
  private loading: Promise<Pipeline> | null = null;

  async embed(text: string): Promise<Float32Array> {
    const p = await this.getPipeline();
    const output = (await p(text, { pooling: "mean", normalize: false })) as PipelineOutput;
    return new Float32Array(output.data);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const p = await this.getPipeline();
    const outputs = await p(texts, { pooling: "mean", normalize: false });

    if (isPipelineOutputArray(outputs)) {
      return outputs.map((output) => new Float32Array(output.data));
    }

    if (texts.length === 1) {
      const single = outputs as PipelineOutput;
      return [new Float32Array(single.data)];
    }

    if (hasBatchShape(outputs, texts.length)) {
      const [rows, columns] = outputs.dims;
      const flat = new Float32Array(outputs.data);
      const vectors: Float32Array[] = [];

      for (let row = 0; row < rows; row += 1) {
        const start = row * columns;
        const end = start + columns;
        vectors.push(flat.slice(start, end));
      }

      return vectors;
    }

    return [new Float32Array((outputs as PipelineOutput).data)];
  }

  dimensions(): number {
    return 384;
  }

  isReady(): boolean {
    return this.pipe !== null;
  }

  async warmUp(): Promise<void> {
    await this.getPipeline();
  }

  async getPipeline(): Promise<Pipeline> {
    if (this.pipe) return this.pipe;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      // @ts-expect-error — HuggingFace pipeline() union type too complex for TS
      const p: Pipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
      );
      this.pipe = p;
      this.loading = null;
      return p;
    })();

    return this.loading;
  }
}

/** Singleton instance — shared across the entire process. */
export const localEmbedder = new LocalEmbedder();

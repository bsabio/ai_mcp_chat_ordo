import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Mock the @huggingface/transformers module so we never load a real
 *  ML model in CI.  The mock pipeline returns deterministic Float32
 *  vectors of 384 dims, matching Xenova/all-MiniLM-L6-v2.            */
/* ------------------------------------------------------------------ */
const DIMS = 384;

function fakeOutput(text: string) {
  // deterministic vector seeded from first char code
  const seed = text.charCodeAt(0) || 1;
  const data = new Float32Array(DIMS);
  for (let i = 0; i < DIMS; i++) data[i] = (seed + i) / DIMS;
  return { data };
}

const mockPipeline = vi.fn(
  async (input: string | string[]) => {
    if (Array.isArray(input)) {
      if (input.length === 1) return fakeOutput(input[0]);
      return input.map((t) => fakeOutput(t));
    }
    return fakeOutput(input);
  },
);

const pipelineFactory = vi.fn(async () => mockPipeline);

vi.mock("@huggingface/transformers", () => ({
  pipeline: pipelineFactory,
}));

/* ------------------------------------------------------------------ */
/*  We need a fresh LocalEmbedder instance per test because the       */
/*  singleton is cached. Use dynamic import + resetModules.            */
/* ------------------------------------------------------------------ */

async function freshEmbedder() {
  // resetModules so the module-level singleton is re-created
  vi.resetModules();
  // re-apply the mock after reset
  vi.doMock("@huggingface/transformers", () => ({
    pipeline: pipelineFactory,
  }));
  const mod = await import("@/adapters/LocalEmbedder");
  return mod.localEmbedder;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("Spec 09 — Embedder Warm-Up & True Batching", () => {
  beforeEach(() => {
    pipelineFactory.mockClear();
    mockPipeline.mockClear();
  });

  it("localEmbedder is a singleton across imports", async () => {
    const mod1 = await import("@/adapters/LocalEmbedder");
    const mod2 = await import("@/adapters/LocalEmbedder");
    expect(mod1.localEmbedder).toBe(mod2.localEmbedder);
  });

  it("isReady() returns false before warmUp, true after", async () => {
    const embedder = await freshEmbedder();
    expect(embedder.isReady()).toBe(false);
    await embedder.warmUp();
    expect(embedder.isReady()).toBe(true);
  });

  it("concurrent getPipeline calls load the pipeline only once", async () => {
    const embedder = await freshEmbedder();
    pipelineFactory.mockClear();

    // Fire 5 concurrent getPipeline calls
    await Promise.all([
      embedder.getPipeline(),
      embedder.getPipeline(),
      embedder.getPipeline(),
      embedder.getPipeline(),
      embedder.getPipeline(),
    ]);

    expect(pipelineFactory).toHaveBeenCalledTimes(1);
  });

  it("embed() returns a Float32Array of expected dimensions", async () => {
    const embedder = await freshEmbedder();
    const result = await embedder.embed("hello world");
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(DIMS);
  });

  it("embedBatch() returns correct number of results", async () => {
    const embedder = await freshEmbedder();
    const results = await embedder.embedBatch(["alpha", "beta", "gamma"]);
    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r).toBeInstanceOf(Float32Array);
      expect(r.length).toBe(DIMS);
    });
  });

  it("embedBatch([]) returns empty array", async () => {
    const embedder = await freshEmbedder();
    const results = await embedder.embedBatch([]);
    expect(results).toEqual([]);
  });

  it("embedBatch() with one item returns single-element array", async () => {
    const embedder = await freshEmbedder();
    const results = await embedder.embedBatch(["solo"]);
    expect(results).toHaveLength(1);
    expect(results[0]).toBeInstanceOf(Float32Array);
    expect(results[0].length).toBe(DIMS);
  });
});

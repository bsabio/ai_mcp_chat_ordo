# Spec 09: Embedder Warm-Up & True Batching

**Priority:** High
**Risk if deferred:** First-hit latency spikes; redundant pipeline loads waste memory and CPU; fake batching hides sequential performance
**Files in scope:**
- `src/adapters/LocalEmbedder.ts` (~35 lines)
- `src/lib/chat/tool-composition-root.ts` (creates new instances per use)
- Any file that instantiates `LocalEmbedder`

---

## Problem Statement

1. **No singleton:** `LocalEmbedder` is instantiated fresh in at least 3 places (tool-composition-root, search-pipeline, embedding-module). Each instance maintains its own `pipe: Pipeline | null`, so the expensive Hugging Face pipeline load happens multiple times per process.

2. **Lazy load without warm-up:** The pipeline loads on first `embed()` call. In production, the first user request touching embeddings pays a multi-second initialization cost.

3. **Fake batching:** `embedBatch(texts)` calls `Promise.all(texts.map(t => this.embed(t)))`, which creates N individual embedding calls. The Hugging Face `transformers` pipeline supports true batch input, which is significantly faster.

---

## Architectural Approach

### Step 1: Make LocalEmbedder a module-level singleton

```typescript
// src/adapters/LocalEmbedder.ts
import type { Pipeline } from "@huggingface/transformers";

class LocalEmbedder {
  private pipe: Pipeline | null = null;
  private loading: Promise<Pipeline> | null = null;

  async getPipeline(): Promise<Pipeline> {
    if (this.pipe) return this.pipe;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const p = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      this.pipe = p;
      this.loading = null;
      return p;
    })();

    return this.loading;
  }

  async embed(text: string): Promise<Float32Array> {
    const p = await this.getPipeline();
    const output = await p(text, { pooling: "mean", normalize: false });
    return new Float32Array(output.data);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (texts.length === 0) return [];
    const p = await this.getPipeline();
    // True batch: pass all texts at once
    const outputs = await p(texts, { pooling: "mean", normalize: false });
    // outputs shape depends on the pipeline; handle both single and batch returns
    if (texts.length === 1) {
      return [new Float32Array(outputs.data)];
    }
    return texts.map((_, i) => new Float32Array(outputs[i].data));
  }

  isReady(): boolean {
    return this.pipe !== null;
  }

  async warmUp(): Promise<void> {
    await this.getPipeline();
  }
}

/** Singleton instance — shared across the entire process. */
export const localEmbedder = new LocalEmbedder();

// Backward compatibility: default export of the instance
export default localEmbedder;
```

### Step 2: Guard concurrent pipeline loads

The `loading` promise in step 1 ensures that if `getPipeline()` is called concurrently (e.g., multiple requests during first load), only one pipeline load runs. All callers await the same promise.

### Step 3: Add explicit warm-up hook

```typescript
// src/lib/startup.ts or in start-server.mjs
import { localEmbedder } from "@/adapters/LocalEmbedder";

export async function warmUpServices(): Promise<void> {
  console.log("[startup] Warming up embedder pipeline...");
  await localEmbedder.warmUp();
  console.log("[startup] Embedder ready.");
}
```

Call this after the server starts listening but before accepting traffic, or in a background task that runs immediately on boot.

### Step 4: Replace all `new LocalEmbedder()` with the singleton import

```typescript
// Before — in tool-composition-root.ts, search-pipeline, etc.
const embedder = new LocalEmbedder();

// After
import { localEmbedder } from "@/adapters/LocalEmbedder";
// use localEmbedder directly
```

### Step 5: Implement true batch embedding

The `@huggingface/transformers` pipeline accepts an array of strings as input. Replace the `Promise.all(map)` pattern with a single pipeline call (shown in Step 1 above). If the pipeline does not support array input for the model in use, fall back to chunked sequential processing with a configurable batch size:

```typescript
async embedBatchChunked(texts: string[], chunkSize = 16): Promise<Float32Array[]> {
  const results: Float32Array[] = [];
  const p = await this.getPipeline();
  for (let i = 0; i < texts.length; i += chunkSize) {
    const chunk = texts.slice(i, i + chunkSize);
    const outputs = await p(chunk, { pooling: "mean", normalize: false });
    // ... extract and push results
  }
  return results;
}
```

---

## Constraints — Do NOT Introduce

- **Do not** make the singleton configurable or inject it via DI. A module-level singleton is the right pattern for a heavy resource like a pipeline.
- **Do not** add a second embedding model or make the model name configurable in this spec. The model stays as `Xenova/all-MiniLM-L6-v2`.
- **Do not** add GPU/WebGPU support. CPU inference is the current target.
- **Do not** block server startup on warm-up. Warm-up should run after the server is listening or in a non-blocking background task.
- **Do not** export the `LocalEmbedder` class for external instantiation. Only the singleton instance should be importable.

---

## Required Tests

### Unit Tests — `tests/embedder-warmup-batching.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `localEmbedder is a singleton across imports` | Import `localEmbedder` in two separate test scopes, confirm `===` identity. |
| 2 | `isReady() returns false before warmUp, true after` | Fresh state → `isReady()` is false. Call `warmUp()`, then `isReady()` is true. |
| 3 | `concurrent getPipeline calls load the pipeline only once` | Spy on `import("@huggingface/transformers")`. Call `getPipeline()` 5 times concurrently. Assert the import was called exactly once. |
| 4 | `embed() returns a Float32Array of expected dimensions` | Embed a test string, confirm result is `Float32Array` and length matches model output (384 for MiniLM-L6-v2). |
| 5 | `embedBatch() returns correct number of results` | Batch-embed 3 strings, confirm array of 3 `Float32Array` results. |
| 6 | `embedBatch([]) returns empty array` | Edge case — no crash, returns `[]`. |
| 7 | `embedBatch() with one item returns single-element array` | Edge case — still returns `[Float32Array]`, not bare `Float32Array`. |

### Regression Test — `tests/embedder-no-new-instances.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `no files in src/ use "new LocalEmbedder()"` | Grep `src/` for `new LocalEmbedder`. Confirm zero matches (all use the singleton import). |

### Performance Test (optional, run manually) — `tests/embedder-batch-performance.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `true batch embedding is faster than sequential for 10+ texts` | Embed 20 texts via `embedBatch()` and via individual `embed()` calls. Assert batch is at least 1.5x faster. (Mark as `.skip` in CI if pipeline is unavailable.) |

---

## Acceptance Criteria

- [ ] `LocalEmbedder` exports a singleton instance, not a class constructor.
- [ ] All `new LocalEmbedder()` calls are replaced with the singleton import.
- [ ] `warmUp()` method exists and can be called at server startup.
- [ ] Concurrent `getPipeline()` calls share a single loading promise.
- [ ] `embedBatch()` uses true batch pipeline input, not `Promise.all(map)`.
- [ ] `isReady()` reflects pipeline initialization state.
- [ ] All existing embedding tests pass.
- [ ] New tests above pass.

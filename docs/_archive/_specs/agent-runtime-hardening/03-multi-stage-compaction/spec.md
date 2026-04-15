# Multi-Stage Compaction — Progressive Summarization With Safety Fallbacks

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Replace OrdoSite's single-tier context window trimming with a progressive, multi-stage summarization system that can handle long formation sessions gracefully — splitting history into chunks, summarizing each independently, merging partial summaries in a final pass, and applying a cascade of safety fallbacks when individual messages or chunks are too large to summarize safely.
> **Dependencies:** [Transcript Store](../06-transcript-store/spec.md) — compaction events must be logged as markers in the transcript.
> **Affects:** `src/lib/chat/context-window.ts`, `src/app/api/chat/stream/route.ts`, `src/lib/chat/stream-pipeline.ts`
> **Motivation:** Formation sessions are long. A student working through a curriculum module — self-assessment, identity mapping, portfolio review, proof-of-work generation — can easily run 60-80 turns. Silent context drift at turn 30 means the agent forgets what the student decided at turn 10 and starts producing contradictory guidance. This is the worst possible student experience. The current single-tier trimming has no summarization, no fallback, and no visibility. This spec replaces it with the adaptive, multi-stage summarization system validated in production by OpenClaw.
> **Source:** OpenClaw `src/agents/compaction.ts` — `summarizeInStages()`, `summarizeWithFallback()`, `splitMessagesByTokenShare()`, `pruneHistoryForContextShare()`
> **Requirement IDs:** `MSC-001` through `MSC-099`

---

## 1. Problem Statement

### 1.1 Current State

`context-window.ts` trims the message array to fit the token budget. It does this silently — no summary, no marker, no audit log. The oldest messages are dropped. The LLM receives less history with no indication that history was lost. `[MSC-001]`

### 1.2 What Goes Wrong At Scale

| Session Phase | What Happens Without Summarization |
|---|---|
| Turn 1-20 | Full history in context, everything fine |
| Turn 21-35 | Oldest turns start dropping; agent may forget early student decisions |
| Turn 36-50 | Agent confidently contradicts guidance from turn 5 with no signal to the student |
| Turn 51+ | Agent is operating on a fragment; formation curriculum integrity is gone |

For a formation platform, this is not a performance problem — it's a product integrity problem. `[MSC-002]`

### 1.3 The Tool Result Security Problem

Tool results can contain raw API responses, corpus excerpts, or external content. Including these verbatim in a summarization prompt risks feeding sensitive or noisy data through an additional LLM call. OpenClaw explicitly strips `toolResult.details` before any summarization pass. OrdoSite must do the same. `[MSC-003]`

---

## 2. Design Goals

1. **Summarize before trimming.** When the context window fills, generate a summary of the oldest messages rather than silently dropping them. `[MSC-010]`
2. **Preserve tool call/result pairs.** Never split a `tool_use` message from its corresponding `tool_result` across a chunk boundary. `[MSC-011]`
3. **Preserve opaque identifiers.** UUIDs, IDs, hashes, URLs, and hostnames in the conversation must survive summarization verbatim. `[MSC-012]`
4. **Multi-stage for large histories.** When history is very long, split into N chunks, summarize each, then merge the partial summaries in a final pass. `[MSC-013]`
5. **Progressive fallback.** When full summarization fails, exclude oversized messages and note their presence. When that also fails, produce a plain-text note of what was there. `[MSC-014]`
6. **Strip tool result details before summarization.** Security gate against including raw tool output in summarization prompts. `[MSC-015]`
7. **Adaptive chunk ratio.** When individual messages are large relative to the context window, reduce the chunk size to avoid overrunning model limits. `[MSC-016]`
8. **Log compaction events to transcript.** Every compaction must append a marker to the `TranscriptStore` (Spec 06). `[MSC-017]`

---

## 3. Architecture

### 3.1 Core Configuration

```typescript
export const BASE_CHUNK_RATIO = 0.4;     // default: use 40% of context for each chunk
export const MIN_CHUNK_RATIO = 0.15;     // minimum when messages are large
export const SAFETY_MARGIN = 1.2;        // 20% buffer for token estimation inaccuracy
export const SUMMARIZATION_OVERHEAD_TOKENS = 4096; // reserved for prompt + serialization

export type CompactionIdentifierPolicy = "strict" | "off" | "custom";

export interface CompactionConfig {
  identifierPolicy?: CompactionIdentifierPolicy;
  identifierInstructions?: string;
  customInstructions?: string;
  parts?: number;              // number of stages (default: 2)
  maxHistoryShare?: number;    // max fraction of context for history (default: 0.5)
}
```

`[MSC-031]`

### 3.2 Token-Share Splitting (Respects Tool Pairing)

```typescript
export function splitMessagesByTokenShare(
  messages: Message[],
  parts: number = 2,
): Message[][] {
  // Split messages into N roughly equal token-share chunks.
  // INVARIANT: never split between a tool_use and its tool_result.
  // When a split point falls inside a tool_use/tool_result pair,
  // move the split to after the complete pair resolves.
}
```

`[MSC-032]`

### 3.3 Security Gate — Strip Tool Result Details

```typescript
export function stripToolResultDetails(messages: Message[]): Message[] {
  // Return messages with toolResult.details removed.
  // toolResult.content (the human-readable summary) is kept.
  // toolResult.details (the raw payload) is stripped.
  // NEVER pass raw tool result details into a summarization prompt.
}
```

`[MSC-033]`

### 3.4 Adaptive Chunk Ratio

```typescript
export function computeAdaptiveChunkRatio(
  messages: Message[],
  contextWindow: number,
): number {
  const avgTokens = estimateMessagesTokens(messages) / messages.length;
  const safeAvgTokens = avgTokens * SAFETY_MARGIN;
  const avgRatio = safeAvgTokens / contextWindow;

  if (avgRatio > 0.1) {
    const reduction = Math.min(avgRatio * 2, BASE_CHUNK_RATIO - MIN_CHUNK_RATIO);
    return Math.max(MIN_CHUNK_RATIO, BASE_CHUNK_RATIO - reduction);
  }
  return BASE_CHUNK_RATIO;
}
```

`[MSC-034]`

### 3.5 Progressive Summarization Fallback Chain

```typescript
// Level 1: Full summarization of all messages
async function summarizeChunks(params): Promise<string> { ... }

// Level 2: Exclude oversized messages (> 50% of context), note them
async function summarizeWithFallback(params): Promise<string> {
  try { return await summarizeChunks(params); }
  catch { /* fall through */ }
  const { smallMessages, oversizedNotes } = splitBySize(params.messages, params.contextWindow);
  if (smallMessages.length > 0 && smallMessages.length !== params.messages.length) {
    try {
      const partial = await summarizeChunks({ ...params, messages: smallMessages });
      return partial + "\n\n" + oversizedNotes.join("\n");
    } catch { /* fall through */ }
  }
  // Level 3: Plain text note
  return `Context contained ${params.messages.length} messages. Summary unavailable.`;
}
```

`[MSC-035]`

### 3.6 Multi-Stage Entry Point

```typescript
export async function summarizeInStages(params: {
  messages: Message[];
  model: ModelConfig;
  apiKey: string;
  signal: AbortSignal;
  contextWindow: number;
  compactionConfig?: CompactionConfig;
  transcriptStore?: TranscriptStore;
}): Promise<string> {
  const parts = params.compactionConfig?.parts ?? 2;
  const splits = splitMessagesByTokenShare(stripToolResultDetails(params.messages), parts);

  if (splits.length <= 1) {
    return summarizeWithFallback({ ...params, messages: splits[0] ?? [] });
  }

  // Summarize each part independently
  const partialSummaries = await Promise.all(
    splits.map(chunk => summarizeWithFallback({ ...params, messages: chunk }))
  );

  // Merge partial summaries in a final pass
  const mergedSummary = await mergePartialSummaries(partialSummaries, params);

  // Log compaction to transcript
  params.transcriptStore?.appendCompactionMarker(params.messages.length);

  return mergedSummary;
}
```

`[MSC-036]`

### 3.7 Identifier Preservation Instructions

```
MUST PRESERVE (verbatim, no shortening or reconstruction):
- UUIDs and all opaque identifiers
- Hashes and content fingerprints
- API tokens and keys (never summarize these away)
- Hostnames, IP addresses, ports, and URLs
- File names and paths
- Session IDs and conversation IDs
```

This is injected as a compaction instruction when `identifierPolicy === "strict"` (default). `[MSC-037]`

### 3.8 Merge Pass Instructions

```
Merge these partial summaries into a single cohesive summary.

MUST PRESERVE:
- Active tasks and their current status (in-progress, blocked, pending)
- Batch operation progress (e.g., "5/17 items completed")
- The last thing the user requested and what was being done about it
- Decisions made and their rationale
- TODOs, open questions, and constraints
- Any commitments or follow-ups promised

PRIORITIZE recent context over older history.
The agent needs to know what it was doing, not just what was discussed.
```

`[MSC-038]`

---

## 4. Security And Access

1. **Tool result details are never fed to summarization.** `stripToolResultDetails()` is called as the first step of any summarization path. `[MSC-040]`
2. **Summarization uses the configured model and auth.** The same model and API key as the main session. No special permissions or bypass. `[MSC-041]`
3. **Summaries are user-scoped.** Summaries generated from one user's session must not appear in another user's context. `[MSC-042]`
4. **Compaction is logged but not reversible.** The transcript store marker records that compaction happened; the dropped messages cannot be recovered from the runtime (they exist only in the DB and transcript store). `[MSC-043]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `splitMessagesByTokenShare()` | 8 | Tool pairing integrity, token budget adherence, edge cases |
| `stripToolResultDetails()` | 6 | Details removed, content preserved, no mutation |
| `computeAdaptiveChunkRatio()` | 6 | Large messages reduce ratio, minimum enforced |
| `summarizeWithFallback()` | 8 | Full → partial → plain text cascade |
| Identifier preservation instructions | 4 | Strict, off, custom policy |
| Merge pass instructions | 4 | Correct structure, recent bias |

### 5.2 Integration Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Full multi-stage flow | 5 | Long conversation summarized and merged correctly |
| Tool pair never split | 4 | tool_use and tool_result always in same chunk |
| Oversized message fallback | 4 | Large messages excluded, noted in summary |
| Compaction marker in transcript | 4 | TranscriptStore receives marker event |
| Retry on summarization failure | 5 | Transient API failure retried, success after retry |

### 5.3 Existing Test Preservation

The current `trimContextWindow()` path must remain available as a fallback for sessions where summarization is not configured. Compaction is opt-in at the session/instance level. `[MSC-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Core Primitives** | `splitMessagesByTokenShare()`, `stripToolResultDetails()`, `computeAdaptiveChunkRatio()`. Token estimation. Full unit coverage. | +18 |
| **1** | **Summarization Chain** | `summarizeChunks()`, `summarizeWithFallback()` with 3-level fallback. Retry logic. | +16 |
| **2** | **Multi-Stage And Merge** | `summarizeInStages()`, merge pass instructions, identifier preservation. | +10 |
| **3** | **Pipeline Integration** | Wire into `context-window.ts` and `stream-pipeline.ts`. Transcript store marker. Config flags. | +10 |

---

## 7. Future Considerations

1. Compaction quality scoring — measure summary fidelity against the original using an eval harness.
2. Incremental compaction — compact only the oldest N messages rather than the full history when the window fills slightly.
3. Student-visible compaction indicator — surface a lightweight UI signal when compaction has occurred so students know the agent's active context was summarized.
4. Custom formation curriculum compaction instructions — allow corpus bundles to inject domain-specific preservation instructions (e.g., "always preserve the student's archetype assessment").

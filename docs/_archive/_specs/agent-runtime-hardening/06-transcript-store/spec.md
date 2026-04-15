# Transcript Store — Two-Tier Session Log And Context Compaction

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Add a `TranscriptStore` abstraction that maintains an append-only, full-fidelity session log as a separately managed tier from the trimmed LLM context window. Modeled on the two-tier compaction model from the Claude Code harness (`TranscriptStore` + `QueryEnginePort.compact_messages_if_needed()`).
> **Dependencies:** [Conversation Operations And Retention](../../conversation-operations-and-retention/spec.md), [Chat Experience](../../chat-experience/spec.md), [Conversation Memory](../../conversation-memory/spec.md)
> **Affects:** `src/lib/chat/context-window.ts`, `src/lib/chat/stream-pipeline.ts`, `src/lib/chat/conversation-root.ts`, conversation persistence layer
> **Motivation:** OrdoSite's current context-window management trims the message history passed to the LLM based on token budget. This is correct behavior, but the trimmed history is the only representation — there is no separately maintained full transcript. This means session export, replay, fine-tuning data collection, and audit trails all depend on the database's raw messages table, with no control over compaction or what was actually sent to the model. The Claude Code harness solves this with an explicit two-tier model: a `TranscriptStore` (full, append-only log) separate from the mutable context buffer (what the LLM actually sees).
> **Requirement IDs:** `TRS-001` through `TRS-099`

---

## 1. Problem Statement

### 1.1 Current State

`context-window.ts` manages the trimmed message array sent to Anthropic on each request. It is the only session-history representation in the request pipeline. There is no separately maintained "full transcript" concept. `[TRS-001]`

### 1.2 Verified Gaps

| # | Gap | Impact |
|---|---|---|
| 1 | **No full-fidelity session log in the pipeline** | Context window trimming discards messages silently; what was sent to the LLM on each turn vs. what was stored in the DB are not explicitly tracked as separate concepts. |
| 2 | **Export depends on raw DB queries** | The `/export` slash command (once built) would need to reconstruct conversation history from raw DB rows, with no concept of what was in scope for any given turn. |
| 3 | **No replay cursor for reconnect** | There is no lightweight turn-level cursor on the in-memory pipeline session; reconnect recovery rebuilds entirely from the DB. |
| 4 | **Context compaction is not explicit** | When `context-window.ts` trims history, this is a silent operation — no event, no log entry, no marker that compaction occurred at a specific turn. |
| 5 | **No fine-tuning or eval data surface** | To produce training examples from real sessions, the system needs to know exactly what context was in scope when the model produced each response. |

### 1.3 Root Cause

The system treats session history as a single mutable array managed for LLM budget. It lacks a second, immutable tier that preserves the canonical record regardless of what the LLM context window contains. `[TRS-002]`

### 1.4 Why It Matters

Without a `TranscriptStore`:

- Export requires DB reconstruction, not pipeline-native access
- Compaction is silent and unauditable
- Replay and reconnect are always full DB reloads
- Eval and fine-tuning data collection has no clean hook point

`[TRS-003]`

---

## 2. Design Goals

1. **Two tiers: transcript log and context buffer.** The transcript is append-only and never trimmed. The context buffer is a sliding window managed for token budget. `[TRS-010]`
2. **Transcript is the source of truth for export.** Any session export (Markdown, JSON) must pull from the transcript, not reconstruct from the DB. `[TRS-011]`
3. **Compaction is explicit and logged.** When the context buffer is trimmed, a compaction marker must be appended to the transcript so the event is auditable. `[TRS-012]`
4. **Replay uses the transcript.** A session replay path must reconstruct context from the transcript log, not from a raw DB message query. `[TRS-013]`
5. **Transcript entries carry turn metadata.** Each entry must record: turn index, role, content reference or hash, timestamp, token estimate, and whether it was included in the LLM context on that turn. `[TRS-014]`
6. **Persistence is async and non-blocking.** Transcript append operations must not block the main chat stream. `[TRS-015]`
7. **Compatible with DB-backed conversation store.** The `TranscriptStore` supplements, not replaces, the existing conversation messages table. `[TRS-016]`

---

## 3. Architecture

### 3.1 TranscriptEntry Model

```typescript
export type TranscriptEntryRole = "user" | "assistant" | "tool_result" | "system" | "compaction_marker";

export interface TranscriptEntry {
  /** Monotonic turn index within this session */
  turnIndex: number;
  /** ISO timestamp when this entry was appended */
  timestamp: string;
  /** Message role */
  role: TranscriptEntryRole;
  /** Content summary (may be truncated for large tool results) */
  contentSummary: string;
  /** SHA-256 of full content, for integrity and deduplication */
  contentHash: string;
  /** Estimated token count for this entry */
  tokenEstimate: number;
  /** Whether this entry was included in the LLM context window on the associated turn */
  inContextWindow: boolean;
  /** If role === "compaction_marker", the number of entries compacted */
  compactedCount?: number;
}
```

`[TRS-031]`

### 3.2 TranscriptStore Class

```typescript
export class TranscriptStore {
  private entries: TranscriptEntry[] = [];
  private turnCounter = 0;
  private persistQueue: Promise<void> = Promise.resolve();

  append(entry: Omit<TranscriptEntry, "turnIndex" | "timestamp">): TranscriptEntry {
    const full: TranscriptEntry = {
      ...entry,
      turnIndex: this.turnCounter++,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(full);
    return full;
  }

  appendCompactionMarker(compactedCount: number): void {
    this.append({
      role: "compaction_marker",
      contentSummary: `Context compacted. ${compactedCount} entries removed from context window.`,
      contentHash: "",
      tokenEstimate: 0,
      inContextWindow: false,
      compactedCount,
    });
  }

  replay(): TranscriptEntry[] {
    return [...this.entries];
  }

  exportAsMarkdown(): string {
    return this.entries
      .filter(e => e.role !== "compaction_marker")
      .map(e => `**[${e.role}]** ${e.contentSummary}`)
      .join("\n\n");
  }

  exportAsJson(): TranscriptEntry[] {
    return this.replay();
  }

  /** Async persist to DB — never blocks the pipeline */
  schedulePersist(persistFn: (entries: TranscriptEntry[]) => Promise<void>): void {
    const snapshot = this.replay();
    this.persistQueue = this.persistQueue
      .then(() => persistFn(snapshot))
      .catch(err => logEvent("error", "transcript.persist.error", { error: String(err) }));
  }
}
```

`[TRS-032]`

### 3.3 Integration with Context Window

`context-window.ts` must be extended to notify the `TranscriptStore` on compaction:

```typescript
export function trimContextWindow(
  messages: Message[],
  tokenBudget: number,
  transcriptStore?: TranscriptStore,
): Message[] {
  const original = messages.length;
  const trimmed = performTrim(messages, tokenBudget); // existing logic
  const compactedCount = original - trimmed.length;

  if (compactedCount > 0 && transcriptStore) {
    transcriptStore.appendCompactionMarker(compactedCount);
  }

  return trimmed;
}
```

`[TRS-033]`

### 3.4 Integration with Stream Pipeline

In `stream-pipeline.ts`, the `TranscriptStore` is initialized per conversation session and passed through the pipeline:

```typescript
// In ChatStreamPipeline or conversation session initialization
const transcriptStore = new TranscriptStore();

// On each user message:
transcriptStore.append({
  role: "user",
  contentSummary: latestUserText.slice(0, 500),
  contentHash: sha256(latestUserText),
  tokenEstimate: estimateTokens(latestUserText),
  inContextWindow: true,
});

// On each assistant response completion:
transcriptStore.append({
  role: "assistant",
  contentSummary: assistantText.slice(0, 500),
  contentHash: sha256(assistantText),
  tokenEstimate: estimateTokens(assistantText),
  inContextWindow: true,
});

// Schedule async persist after each turn
transcriptStore.schedulePersist(async (entries) => {
  await transcriptRepo.upsertEntries(conversationId, entries);
});
```

`[TRS-034]`

### 3.5 Transcript Persistence Table

**New table: `conversation_transcript_entries`**

```sql
CREATE TABLE IF NOT EXISTS conversation_transcript_entries (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  role TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  token_estimate INTEGER NOT NULL DEFAULT 0,
  in_context_window INTEGER NOT NULL DEFAULT 1, -- SQLite bool
  compacted_count INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transcript_conversation_turn
  ON conversation_transcript_entries(conversation_id, turn_index);
```

`[TRS-035]`

### 3.6 Export Surface

The `TranscriptStore` export methods are consumed by the `/export` slash command:

```typescript
// SlashCommand: /export markdown
const transcript = await transcriptRepo.loadForConversation(conversationId);
const store = TranscriptStore.fromEntries(transcript);
return store.exportAsMarkdown();

// SlashCommand: /export json
return JSON.stringify(store.exportAsJson(), null, 2);
```

`[TRS-036]`

### 3.7 Relationship to Existing DB Messages

The `TranscriptStore` is an audit/replay tier, not a replacement for the `messages` table:

| Layer | Purpose | Mutability |
|---|---|---|
| `messages` table | Authoritative conversation history, LLM rounds | Immutable append |
| `context-window.ts` | Trimmed buffer passed to LLM API | Mutable per-request |
| `TranscriptStore` | Full-fidelity session log with context metadata | Append-only |

The transcript adds context-window metadata (which entries were in scope per turn) that the raw messages table cannot express. `[TRS-037]`

---

## 4. Security And Access

1. **Transcript access follows conversation ownership.** Loading a conversation transcript requires the same authorization as loading conversation messages. `[TRS-040]`
2. **Content summaries are truncated.** `contentSummary` fields must not store full message bodies — only the first 500 characters. Full content lives in the `messages` table. `[TRS-041]`
3. **Content hashes enable integrity verification.** Clients or admins can verify transcript integrity by comparing `contentHash` against stored message content. `[TRS-042]`
4. **Async persist failures are logged, not silenced.** Transcript persist errors must appear in observability logs and not surface to the user. `[TRS-043]`
5. **Export is user-scoped.** The `/export` command must verify conversation ownership before returning transcript data. `[TRS-044]`
6. **Compaction markers are non-removable.** The transcript is append-only; compaction markers may not be deleted retroactively. `[TRS-045]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| `TranscriptStore.append()` | 6 | Turn index increment, timestamp, field mapping |
| `appendCompactionMarker()` | 4 | Compacted count recorded, role = `compaction_marker` |
| `replay()` and `exportAsMarkdown()` | 6 | Correct ordering, marker filtering in Markdown export |
| `exportAsJson()` | 4 | Full entry array returned including markers |
| `schedulePersist()` isolation | 4 | Persist failure does not throw in pipeline |
| `trimContextWindow()` with transcript | 6 | Compaction marker appended when trimming occurs |

### 5.2 Integration Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Transcript populated per turn | 5 | User + assistant entries appended per stream turn |
| Compaction logged on trim | 4 | Context trim generates transcript compaction marker |
| DB persist round-trip | 4 | `schedulePersist` writes entries, `loadForConversation` reads them |
| Export content accuracy | 4 | `/export markdown` output matches transcript entries |
| Context window ≠ transcript | 4 | Verify trimmed entries are absent from LLM context but present in transcript |

### 5.3 Existing Test Preservation

Context window trimming behavior must remain identical. `TranscriptStore` integration must be additive — no existing message or LLM context behavior changes. `[TRS-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **TranscriptStore Core** | Implement `TranscriptStore` class, `TranscriptEntry` type, `appendCompactionMarker()`, `replay()`, `exportAsMarkdown()`, `exportAsJson()`. Unit tests. | +20 |
| **1** | **Context Window Integration** | Extend `trimContextWindow()` to notify `TranscriptStore` on compaction. Wire store into `stream-pipeline.ts` per session. | +14 |
| **2** | **DB Persistence** | Add `conversation_transcript_entries` table, repository, and `schedulePersist()` integration. | +12 |
| **3** | **Export Surface** | Connect `TranscriptStore` export to `/export` slash command. Add ownership checks. | +10 |

---

## 7. Future Considerations

1. Transcript diff view — show what was in context vs. not for any given turn in an admin/debug UI.
2. Fine-tuning data pipeline — export conversation transcripts with context-in-scope metadata as structured training examples.
3. Transcript search — full-text search across session transcripts for analytics or content moderation.
4. Compression at persist — compress large transcript entries at the DB layer to reduce storage cost.
5. Cursor-based reconnect — use the transcript `turnIndex` as a reconnect cursor so the session can resume at the exact last acknowledged turn.

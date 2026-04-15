# Semantic Rechunking Design

> **Scope:** Sprint 5 retrieval substrate hardening

## Deployed Rules

- Treat `##` headings as hard semantic boundaries for section starts.
- Treat `###` headings as hard semantic boundaries for passage starts inside larger sections.
- Treat paragraph breaks as the default soft boundary when a section must be split further.
- Never split inside fenced code blocks, lists, blockquotes, or tables.
- Allow variable chunk sizes within the configured floor and ceiling instead of forcing uniform windows.

## Structural Metadata Contract

Each document chunk now carries additive structure so retrieval results can explain where the winning passage sits inside its source section:

- `chunkId`
- `chunkLevel`
- `localChunkIndex`
- `localChunkCount`
- `parentChunkId`
- `previousChunkId`
- `nextChunkId`
- `boundarySource`
- `conceptKeywords`

This metadata is persisted through the embedding pipeline and surfaced in `search_corpus` result payloads when the indexed search path is active.

## Audit Intent

Sprint 5 does not assume that more aggressive retrieval architecture is warranted. The governed artifacts should answer four questions first:

- where chunk boundaries actually fall
- which concepts span multiple chunks
- how sensitive retrieval is to query phrasing
- which representative sections are still fragile in top-3 retrieval

Only after those artifacts are reviewed should hierarchical retrieval, heavier hybrid tuning, or query expansion move from optional follow-ons into shipped behavior.

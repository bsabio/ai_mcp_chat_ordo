# Deep-Dive: Search, RBAC, and Memory Architecture

This document provides a technical deep-dive into the core systems of OrdoSite. It is intended for architects and developers to understand the systemic complexity behind retrieval-augmented generation (RAG), capability governance, and conversation lifecycle.

---

## 1. Search & Retrieval Architecture

OrdoSite uses a **Hybrid Search** strategy that combines the semantic reach of vector embeddings with the lexical precision of keyword search.

### 1.1 Hybrid Search Engine (`HybridSearchEngine.ts`)
The orchestrator merges two distinct ranking signals:
- **Vector Search**: Semantic similarity using local embeddings and dot-product similarity.
- **BM25 Search**: Classical lexical scoring for exact term matching.

### 1.2 Reciprocal Rank Fusion (RRF)
To merge results from these different scoring systems, the engine applies **RRF** (`ReciprocalRankFusion.ts`). This algorithm calculates a unified score based on the rank of a document in each individual search result set rather than its raw score:

$$score(d) = \sum_{r \in \{vector, bm25\}} \frac{1}{k + rank(r, d)}$$
(where $k=60$ by default).

### 1.3 Result Formatting & Deduplication
- **Deduplication**: If multiple passages from the same section appear in the top results, they are consolidated to maximize diversity.
- **Highlighting**: BM25 terms are highlighted in the returned context to aid model reference.
- **Relevance Labeling**: Results are categorized (High, Medium, Low) based on their final RRF rank to help the model weight its evidence.

---

## 2. RBAC & Capability Governance

The system enforces strict alignment between what the model *thinks* it can do (Prompt) and what it *can* do (Execution).

### 2.1 The Tool Registry (`ToolRegistry.ts`)
The `ToolRegistry` is the single source of truth for all system capabilities.
- **Role-Based Scoping**: Each tool is registered with an array of permitted roles (e.g., `["STAFF", "ADMIN"]`).
- **Synchronized Manifests**: The `getSchemasForRole()` method ensures that the tool definitions injected into the system prompt are filtered by the current user's role.

### 2.2 Middleware Enforcement (`RbacGuardMiddleware.ts`)
Tool execution is intercepted by the middleware pipeline:
1. **RbacGuardMiddleware**: Checks `registry.canExecute(name, role)` before call initiation.
2. **ToolCapabilityMiddleware**: Verifies that the tool being called is actually part of the currently active capability manifest.
3. **LoggingMiddleware**: Records all execution attempts (success and denial) for auditing.

---

## 3. Content Chunking & Indexing

To support precision retrieval, the system decomposes documents into hierarchical chunks.

### 3.1 Recursive Markdown Chunker (`MarkdownChunker.ts`)
Chunks are created using a multi-level priority system:
- **Priority 1**: Heading Boundaries (`##`, `###`).
- **Priority 2**: Paragraph Breaks (`\n\n`).
- **Atomic Persistence**: Code blocks, tables, lists, and blockquotes are never split; if an atomic block exceeds the chunk size, it is kept together to preserve readability.

### 3.2 Embedding Prefixes
To combat "lost in the middle" effects and local ambiguity, every chunk's text is prefixed with its document context before being vectorized:
`[Document Title]: [Section Title]. [First Sentence] > [Chunk Content]`

---

## 4. Memory & Context Model

Managing conversation continuity requires balancing full-fidelity history with strict LLM context limits.

### 4.1 Context Window Guard (`context-window.ts`)
The system maintains a strictly bounded prompt window:
- **Warn Threshold**: Triggers a system warning when the window is near capacity.
- **Block Threshold**: Hard-stops requests that exceed character or message limits.
- **Automatic Trimming**: Older messages are trimmed from the active prompt but remain durable in the database.

### 4.2 Multi-Tier Summarization (`SummarizationInteractor.ts`)
To bridge the gap created by trimming, the system uses recursive summarization:
- **Tier 1 (Summaries)**: Every ~20 turns, the system summarizes the preceding block of conversation.
- **Tier 2 (Meta-Summaries)**: When the number of summaries grows too long, they are themselves summarized into a "Meta-summary".
- **Replayability**: Summaries are injected into the system prompt as "System" messages, allowing the model to "remember" trimmed turns.

---

## 5. System Interdependencies

| Area | Depends On | Purpose |
| --- | --- | --- |
| Search | Chunking | Search operates on the chunks produced by the Markdown Chunker. |
| RBAC | Tool Registry | RBAC enforcement relies on metadata stored in the Registry. |
| Memory | Summarization | Context window durability is extended via recursive summarization. |
| Prompt | RBAC | Prompt manifests are filtered by the same RBAC logic that guards execution. |

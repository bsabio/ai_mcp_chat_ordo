# RAG Pipelines from First Principles

## What RAG Is and Why It Exists

RAG stands for Retrieval-Augmented Generation. It is a pattern for building LLM applications where the model's response is grounded in retrieved documents or data, rather than relying entirely on what was encoded in the model's weights during training.

RAG exists to solve a specific set of problems with pure generation:

**The knowledge currency problem.** LLMs are trained on data with a cutoff date. For applications that need accurate information about recent events, updated documentation, or current data, the model's training alone is insufficient.

**The knowledge specificity problem.** General-purpose LLMs know general-purpose information. For applications grounded in proprietary documents, internal knowledge bases, or specialized corpora, the model cannot produce accurate, specific responses without access to that material.

**The hallucination control problem.** LLMs generate text that is plausible given the training distribution, not text that is demonstrably grounded in specific evidence. RAG gives the model specific passages to ground its response in — and makes it possible to check whether the response is actually using those passages.

**The cost efficiency problem.** It is vastly cheaper to retrieve relevant passages and include them in the context window than to fine-tune a model on proprietary data.

## The RAG Architecture

A basic RAG pipeline has five components:

**1. The Corpus**
The body of documents to retrieve from. This can be a set of PDF files, a database table, a set of markdown files, web pages, or any other text source. The corpus defines the knowledge boundary of the system — the RAG pipeline can only ground responses in what the corpus contains.

**2. The Ingestion Pipeline**
The process of preparing the corpus for retrieval. This typically involves: loading documents, splitting them into chunks of appropriate size, embedding those chunks using a vector embedding model, and storing the embeddings in a vector store.

Chunk size matters: too small, and individual chunks lose context; too large, and retrieval precision degrades because irrelevant passages dilute the relevant ones.

**3. The Retrieval System**
The process of finding the most relevant passages for a given user query. This can use:
- **Vector (semantic) search:** Find passages whose embedding is closest to the query embedding. Effective for conceptual or semantic similarity.
- **BM25 (keyword) search:** Find passages that share terms with the query. Effective for exact matches, named entities, specific terminology.
- **Hybrid search:** Combine both. Most production systems use hybrid approaches because the failure modes of vector and keyword search are complementary.

**4. The Reranking Step (optional but important)**
A secondary model or heuristic that re-orders the retrieved passages to improve the final selection. The retrieval system is optimized for recall (find relevant passages); the reranker is optimized for precision (surface the most relevant passages first).

**5. The Generation Step**
The retrieved passages are assembled into a context and passed to the LLM along with the user query and a system prompt. The model generates a response grounded in the provided context.

## What Makes a RAG Pipeline Good vs. Bad

**Retrieval quality is the most important variable.** If the retrieval step surfaces the wrong passages, the generation step cannot compensate. A sophisticated language model grounded in wrong context will produce a confident, fluent, wrongly-grounded response. This is worse than no answer.

**Chunk architecture is a hidden variable.** How documents are split determines what the retrieval system can find. Poor chunking (splitting mid-sentence, losing headers that establish context, fragmented tables) degrades retrieval quality regardless of the sophistication of the embedding model.

**Evaluation is necessary, not optional.** A RAG pipeline without a test suite is not a production system — it is a demo with unknown failure rates. At minimum: a baseline query set with known correct answers, a retrieval recall metric, and a response correctness evaluation for your specific domain.

## The Local-First Architecture

This curriculum's own system (Ordo) implements a local-first RAG architecture: SQLite as the vector and document store, BM25 implemented directly, all processing running on the local machine.

This design provides:
- **Security by default:** The corpus never leaves the machine that hosts it
- **Zero operational cost:** No cloud API calls for retrieval
- **Deterministic behavior:** The retrieval behavior is fully observable and debuggable
- **RBAC integration:** Access to corpus content can be controlled at the row level in SQL

The local-first approach is not always the right choice — it trades scalability for control and cost. But for enterprise deployments where data privacy, cost predictability, and security auditability are primary concerns, it is frequently superior to managed cloud vector databases.

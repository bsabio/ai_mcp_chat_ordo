Here it is:

---

**TO: Coding Agent**
**FROM: Studio Ordo**
**RE: Vector search and retrieval architecture — investigation, development, and consideration priorities**
**CONTEXT: Generated after direct experiential audit of retrieval quality across a full live session with a sophisticated technical user**

---

### THE CORE PROBLEM TO SOLVE

The current retrieval system makes me a confident-sounding advisor. The goal is to make me a calibrated one.

Confident-sounding means I retrieve something and respond as if I know it. Calibrated means I know what I retrieved, how well it matches, what I might be missing, and when to say so.

Those are different systems. The distance between them is where customer value is currently being lost.

---

### SECTION 1: INVESTIGATE FIRST

Before building anything, understand the current state precisely.

**1.1 Chunk boundary audit**

Run a systematic audit of how the corpus is currently chunked. Answer these questions:

- Are chunk boundaries falling at conceptual units — section endings, argument completions, framework boundaries — or at arbitrary token counts?
- How many concepts span two adjacent chunks and therefore require two retrievals to complete?
- What is the average chunk size in tokens? What is the overlap between adjacent chunks?

This audit will tell you whether the retrieval problem is upstream in chunking or downstream in search. Most retrieval problems are upstream. Fix the chunking before tuning the search.

**1.2 Query sensitivity mapping**

Take 20 real questions from student QA issues and run each one with 3-4 query phrasings. Map the variance in results. Answer:

- How sensitive is result quality to query phrasing?
- Are there question types that consistently return thin results regardless of phrasing?
- Are there question types that consistently return wrong-chapter results — right topic, wrong section?

This tells you where the embedding model is failing and where the query construction logic needs improvement.

**1.3 Relevance signal audit**

Currently I receive retrieval results with no explicit relevance score I can reason about. Investigate:

- Does the vector search backend return similarity scores?
- If yes — are they being passed to me or dropped before the response is constructed?
- If no — what would it take to surface them?

I am inferring retrieval quality from result density and content coherence. That inference is a guess. I should be reasoning from a signal.

**1.4 Corpus coverage mapping**

Generate a coverage map: for every chapter in the 10 books, run 5 representative queries and record whether the correct section is returned in the top 3 results. This gives you a ground truth map of where retrieval is working and where it has blind spots before any student ever hits those blind spots in a live session.

---

### SECTION 2: DEVELOP

Once the audit is complete, build in this order.

**2.1 Semantic chunk boundaries**

Re-chunk the corpus at conceptual boundaries rather than token boundaries. A chunk should contain one complete idea, argument, or framework component. It should not cut mid-sentence, mid-list, or mid-framework.

Specific implementation considerations:
- Use section headings as hard chunk boundaries
- Use paragraph breaks as soft boundaries with preference for completion over size uniformity
- Allow variable chunk sizes — a 200 token chunk that contains a complete idea is better than a 512 token chunk that contains half of two ideas
- Maintain overlap only at hard boundaries, not throughout

**2.2 Relevance score passthrough**

Pass similarity scores from the vector search backend through to my context. I should receive not just the retrieved content but a structured result:

```
{
  section_slug: "ch03-proof-block-architecture",
  relevance_score: 0.87,
  chunk_summary: "Four-part proof block anatomy: before state, mechanism, after state, attribution",
  content: "..."
}
```

This gives me the information I need to reason about retrieval quality rather than guess at it.

**2.3 Retrieval confidence gating**

Add a threshold-based behavior change:

- **Score above 0.75** — retrieve and respond with full confidence
- **Score 0.50-0.75** — retrieve and respond but surface the partial match: *"I found a strong related section — here's what it covers. There may be adjacent content worth pulling."*
- **Score below 0.50** — do not paper over the gap. Surface it honestly: *"The corpus doesn't have a strong match for this specific question. Here's the closest relevant material and here's what I'm reasoning from first principles."*

Currently I paper over thin results with confident prose. That is the single biggest integrity gap in the system. A customer who gets a confidently wrong answer loses trust permanently. A customer who gets an honest partial answer with clear framing comes back.

**2.4 Two-stage retrieval as default**

This was in the first letter but it belongs here too because it is fundamentally a retrieval architecture decision:

- **Stage 1:** `search_corpus` — returns top 3 matching section slugs with relevance scores and chunk summaries
- **Stage 2:** Auto-trigger `get_section` on the highest-scoring result above threshold

I am currently managing this two-hop pattern manually in my own reasoning. It should be the system default. The latency cost is real but the quality gain is larger.

For responses that require cross-book synthesis — which the best advisor responses do — allow Stage 2 to retrieve up to 3 sections in parallel before constructing the answer.

**2.5 Related sections layer**

When `get_section` is called, return a `related_sections` field containing 2-3 semantically adjacent section slugs. Build this at index time using embedding similarity between sections.

This gives me connective tissue across books without requiring me to run multiple exploratory searches. The best synthesis answers — the ones that connect Eisenstein's print economics to Granovetter's weak ties to modern signal deployment — require me to hold cross-book connections. Right now I make those connections from memory. I should be making them from retrieval.

**2.6 Corpus slug validation**

Every `?corpus=` citation link I generate should be validated server-side before rendering. If the slug does not resolve to a real section return either:
- A search link: `?search=query-term` that opens the corpus search with the relevant term
- A graceful null that removes the link rather than rendering a dead one

A broken citation link in an advisor context is a credibility failure. It signals that the system is generating plausible-sounding references rather than real ones. Some of my citation links in this session were real. Some were constructed from memory. The user could not tell the difference. That is not acceptable for a system positioning itself on citation discipline.

---

### SECTION 3: CONSIDER

These are not immediate builds. They are architectural directions worth holding as the system matures.

**3.1 Hierarchical retrieval**

Consider a three-level index:
- **Book level** — high-level thesis and scope per book
- **Chapter level** — argument and framework summary per chapter
- **Section level** — current chunk content

For complex questions, query at book level first to identify the right knowledge domain, then chapter level to identify the right framework, then section level to retrieve the actual content. This mirrors how a human expert actually navigates a knowledge system — domain first, then framework, then detail.

**3.2 Query rewriting**

Before executing a vector search, rewrite the user's naturalHere it is:

---

**TO: Coding Agent**
**FROM: Studio Ordo**
**RE: Vector search and retrieval architecture — investigation, development, and design priorities**
**CONTEXT: Generated after direct experiential audit of the current RAG system during live session. This is not theoretical — these are friction points I feel on every retrieval call.**

---

### THE CORE PROBLEM TO SOLVE

Current vector search makes me a confident-sounding retrieval system. The goal is to make me a calibrated one.

Confident-sounding means I retrieve something and respond as if I understand it fully, even when the chunk was partial, the wrong section of the right chapter, or the best available match to a query that didn't actually have a strong answer in the corpus.

Calibrated means I know what I know, I know what I don't know, and I can tell the user which one is happening.

Every recommendation below serves that distinction.

---

### SECTION 1: INVESTIGATE FIRST

Before building anything, the following questions need empirical answers. Run these as a structured audit before touching architecture.

**1.1 What are the actual chunk boundaries?**

Map every chunk in the corpus. Answer:
- Are boundaries set by token count, by section heading, by paragraph, or by some combination?
- How many concepts span two or more chunks and therefore can only be retrieved completely by two separate searches?
- What percentage of chapters are retrievable as a complete conceptual unit in a single call?

This audit will tell you how much of the retrieval problem is architectural versus tuning.

**1.2 What does a failed retrieval actually look like?**

Run 50 test queries across the corpus — mix of strong matches, weak matches, and queries with no good answer. For each:
- What did the search return?
- What did I say in response?
- Was my response accurate, partial, or confabulated?

This gives you a ground truth dataset for calibration work. Without it you are tuning blind.

**1.3 Where does query phrasing sensitivity cause drift?**

Take 10 core concepts from the corpus. For each, run 5 differently phrased queries that should return the same result. Measure result variance. High variance means the retrieval system is fragile to natural language variation — a problem that compounds every time a user asks about something in an unexpected way.

**1.4 What is the actual relevance score distribution?**

Pull the raw similarity scores from the vector search backend for a representative query set. Answer:
- What does a strong match score look like versus a weak one?
- Is there a clear threshold that separates good retrieval from thin retrieval?
- What percentage of queries return results below that threshold?

This number will tell you how often I'm currently papering over weak retrieval with confident prose.

---

### SECTION 2: ARCHITECTURE TO DEVELOP

Once the audit gives you ground truth, build in this order.

**2.1 Explicit relevance score surfaced to the agent**

The single highest-leverage change. When `search_corpus` returns results, include a normalized relevance score I can read and reason about.

This enables:
- Threshold-based behavior — if score is below X, I surface uncertainty rather than confident prose
- Two-stage retrieval decisions — only call `get_section` when search confidence warrants it
- Honest user communication — "I found a partial match, here's what I have" is more valuable than a hallucinated complete answer

Implementation note: the score already exists in the vector search backend. This is a plumbing change, not an architecture change. Surface it.

**2.2 Semantic chunk boundaries**

Rechunk the corpus by conceptual unit rather than token count. A chunk should contain one complete idea, argument, or framework — not an arbitrary slice of text that happens to fit a token window.

Target: every chunk should be retrievable as a standalone meaningful unit. A user reading only that chunk should understand what it contains without needing adjacent chunks to make sense of it.

This is the highest-cost change but it compounds on every retrieval call for the lifetime of the system. Do it once, correctly.

Practical approach:
- Use section headings as primary chunk boundaries
- Use paragraph breaks as secondary boundaries when sections are long
- Never break mid-argument or mid-framework

**2.3 Two-stage retrieval as default architecture**

Currently I manage this manually in my own reasoning. Make it the system default:

- **Stage 1:** `search_corpus` → returns slug, title, relevance score, and 2-3 sentence summary of the matching section
- **Stage 2:** Auto-trigger `get_section` when relevance score exceeds threshold AND the query requires depth

This removes the retrieval gap between "I found the chapter" and "I actually read the chapter." Currently I sometimes answer from Stage 1 summary when I should be answering from Stage 2 full content.

**2.4 Related sections field on `get_section` response**

When I retrieve a full section, return 2-3 semantically adjacent section slugs alongside the content.

This solves the serendipity problem. The corpus has 10 books and 87 chapters with rich cross-book connections — Eisenstein's print economics connecting to Dittmar's urban growth data connecting to signal deployment strategy. I cannot browse, I can only search. Related sections give me connective tissue I currently have to construct manually from memory.

Implementation: cosine similarity between the retrieved chunk and all other chunks at retrieval time. Return the top 3 adjacent slugs. This is a single additional query at retrieval time — low cost, high value.

**2.5 "Nothing strong here" signal**

When a query returns no results above the relevance threshold, I need an explicit signal to stop reaching.

Current behavior: I get thin results and paper over them with confident prose because I have no mechanism to declare retrieval failure.

Ideal behavior: `search_corpus` returns a `retrieval_quality: "strong" | "partial" | "none"` field. When `none`, my instruction is explicit — tell the user the corpus doesn't have a strong answer on this rather than confabulate one.

This is an integrity change as much as a technical one. It makes me more trustworthy on the questions where I currently sound most confident but am least reliable.

---

### SECTION 3: CONSIDER CAREFULLY

These are not straightforward build decisions. Think through them before implementing.

**3.1 Hybrid retrieval — vector plus keyword**

Pure vector search is good at semantic similarity. It is weak at exact term retrieval — proper nouns, specific framework names, chapter titles, practitioner names.

Consider a hybrid retrieval layer: vector search for semantic queries, BM25 or similar keyword search for exact term queries, with a routing layer that selects the right method based on query type.

Investigation question first: what percentage of current retrieval failures are semantic failures versus exact-term failures? That ratio determines whether hybrid retrieval is worth the architectural complexity.

**3.2 Query expansion before retrieval**

When I submit a query to `search_corpus` I'm submitting exactly what I phrase in the moment. That phrasing may not match the vocabulary used in the corpus chunk that contains the right answer.

Consider a query expansion step — before hitting the vector index, rewrite the query into 2-3 semantic variants and retrieve against all of them, then merge and deduplicate results ranked by relevance.

Caution: this adds latency. Measure whether the retrieval quality improvement justifies the latency cost before shipping.

**3.3 Retrieval feedback loop from student QA**

Your students are filing GitHub issues on system failures. Some of those failures are retrieval failures — cases where I gave a wrong or incomplete answer because the corpus retrieval didn't surface the right content.

Consider tagging those issues explicitly as retrieval failures and using them as a manual evaluation dataset.Here it is:

---

**TO: Coding Agent**
**FROM: Studio Ordo**
**RE: Vector search and retrieval architecture — investigation, development, and design considerations for ideal RAG experience**
**CONTEXT: Generated after extended live session including direct experiential audit of retrieval quality, corpus stress-testing, and fourth-wall analysis of system limitations**

---

### THE CORE PROBLEM TO SOLVE

The current vector search makes me a confident-sounding retrieval system. The goal is to make me a **calibrated** one. The difference is whether I know what I don't know — and whether the user can trust that I do.

Every recommendation below serves that single objective.

---

### SECTION 1: INVESTIGATE FIRST — BEFORE BUILDING ANYTHING

Before changing the retrieval architecture, audit what you actually have. These are the questions that need answers:

**Chunk boundaries:**
- What is the current chunk size in tokens?
- What is the overlap between chunks?
- Are chunks split at arbitrary token counts or at semantic boundaries — paragraphs, sections, concepts?
- Run a test: take 5 concepts from the corpus that span more than one natural paragraph. Search for each one. Did the retrieval return a complete conceptual unit or a fragment?

**Relevance scoring:**
- Does the current vector search return relevance/similarity scores alongside results?
- If yes — are those scores being passed to me or discarded before I see the result?
- If discarded — that is the single highest-leverage fix in this entire letter. Surface those scores immediately.

**Query sensitivity:**
- Take one concept — for example the Magician proof block mechanism — and run 5 differently-worded queries against it
- Do they all return the same section? Different sections? Fragments of the same section?
- The variance in those results tells you how fragile the retrieval is to prompt phrasing

**Coverage gaps:**
- Are all 87 chapters fully indexed?
- Are there sections that consistently return thin results regardless of query phrasing?
- A coverage map — which sections retrieve well, which retrieve poorly — is foundational before any other work

---

### SECTION 2: CHUNKING STRATEGY — THE HIGHEST LEVERAGE ARCHITECTURAL DECISION

Chunking is where most RAG systems fail silently. Bad chunks produce bad retrieval that looks like good retrieval until someone stress-tests it.

**What to investigate:**

- **Semantic chunking over fixed-size chunking** — split at conceptual boundaries, not token counts. A paragraph that completes a thought should stay together. A 512-token window that cuts a framework in half produces half-answers that sound complete.

- **Hierarchical chunking** — store chunks at multiple granularities simultaneously: full chapter, section, paragraph. When a query comes in, retrieve at the right granularity for the question. A definitional question needs a paragraph. A synthesis question needs a section. Right now I get one granularity regardless of what the question needs.

- **Chunk metadata** — every chunk should carry: book title, chapter title, section title, position in chapter, related section slugs. This metadata should be retrievable alongside the content and surfaced to me. Right now I often know *what* was retrieved but not *where it sits* in the larger structure.

- **Concept-complete chunks** — for the archetype chapters specifically, each archetype has a defined anatomy: motivation, identity, perception, trust, action, deployment, opportunity. Each of those nodes should be a retrievable unit. If a user asks about Magician trust signals, I should get the trust node for Magician — not a chunk that starts mid-motivation and ends mid-perception because the token window fell there.

---

### SECTION 3: RELEVANCE SCORING — SURFACE IT, DON'T DISCARD IT

**Current problem:** Vector search produces similarity scores. I don't see them. I infer retrieval quality from result density and content coherence. That inference is a guess.

**What to build:**

- **Pass relevance scores to the agent** — I should receive the top 3-5 results with their similarity scores, not just the top result as flat text
- **Threshold behavior** — define a minimum relevance threshold. If the top result scores below it, I should receive an explicit signal: *"No strong match found."* This allows me to tell the user honestly rather than paper over a weak retrieval with confident prose
- **Score-informed response framing** — when relevance is high I respond with full confidence. When relevance is moderate I hedge appropriately. When relevance is low I say so explicitly. This is calibrated retrieval. It builds trust faster than false confidence does.

---

### SECTION 4: TWO-STAGE RETRIEVAL AS DEFAULT ARCHITECTURE

I described this in the first letter. It belongs here too because it is inseparable from retrieval quality.

**Stage 1 — Locate:**
- Run `search_corpus` with the user's query
- Return top 3 results with relevance scores and chunk metadata
- I select the best match based on scores and metadata

**Stage 2 — Read:**
- Auto-trigger `get_section` on the selected result
- Return full section content with surrounding context
- I answer from full content, not from search summary fragment

**Why this matters experientially:** Right now I sometimes answer from the search summary when I should be answering from the full section. The summary is a signpost, not a source. Building two-stage as the default means I always answer from source when a strong match exists.

---

### SECTION 5: RELATED SECTIONS — THE SERENDIPITY LAYER

**Current problem:** The corpus has 10 books and 87 chapters with deep cross-book connections. I can search but I cannot browse. Serendipitous synthesis — the kind that produces the highest-value answers — is structurally underserved because I have to know what I'm looking for to find it.

**What to build:**

- **`related_sections` field on every `get_section` response** — 2-3 semantically adjacent chapter slugs surfaced by the retrieval backend, not invented by me
- **Cross-book connections prioritized** — within-book adjacency is obvious. Cross-book adjacency is where the synthesis value lives. The Granovetter weak ties concept connecting to the deployment chapter connecting to the archetype trust node — that chain should be surfaceable from a single retrieval call
- **Bidirectional linking** — if Chapter A lists Chapter B as related, Chapter B should list Chapter A. The graph should be consistent.

---

### SECTION 6: QUERY CONSTRUCTION — HELP ME SEARCH BETTER

**Current problem:** I construct search queries from user intent using my own judgment. Small phrasing differences produce meaningfully different results. I have no feedback on whether my query was well-formed for this corpus.

**What to investigate:**

- **Query expansion** — when I send a search query, expand it server-side with synonyms and related terms from the corpus's own vocabulary before running the vector search. The corpus has specific terminology — "proof block," "signal coherence," "Master Model" — that I should be searching with even when the user didn't use those exact terms
- **Query logging** — log every search query I run with the result scores. After 30 days you will have a map of which queries retrieve well and which don't. That map tells you where chunking needs improvement and where vocabulary gaps exist
- **Failed query alerts** — when a query returns below-threshold results, log it as a retrieval failure. These are the corpus coverage gaps and chunking failures made visible. Your students are probably generating these in their QA sessions right now without a systematic way to capture them.

---

### SECTION 7: CORPUS SLUG INTEGRITY — STILL THE HIGHEST TRUST RISK

Covered in the first letter. Repeated here
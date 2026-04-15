# Sprint 5 — Semantic Chunking, Query Sensitivity, And Coverage Mapping

> **Status:** Completed
> **Goal:** Measure and improve the upstream retrieval substrate so retrieval
> quality stops being limited by arbitrary chunk fragmentation and brittle query
> phrasing.

## Problem

If conceptual units are being cut into poorly aligned chunks, then score
passthrough and two-stage retrieval can only make the system more honest about a
weak substrate; they cannot make retrieval genuinely stronger.

## Primary Areas

- corpus indexing and build scripts under `scripts/`
- search handler implementations
- generated corpus metadata and release artifacts
- eval scenario inputs derived from real QA failures

## Tasks

1. **Chunk census**
   - Produce a complete map of chunk sizes, overlap, and boundary logic.

2. **Concept-span audit**
   - Measure how often natural concepts or frameworks cross chunk boundaries.

3. **Query sensitivity matrix**
   - Use multiple phrasings per concept and measure result variance.

4. **Coverage map**
   - Sample representative sections across the corpus and record top-3 recall.

5. **Semantic rechunking design**
   - Move toward section/paragraph/concept boundaries.
   - Prefer concept-complete chunks over uniform token windows.

6. **Chunk metadata enrichment**
   - Persist book, chapter, section, local position, and adjacency metadata so
     retrieval results carry structural context.

7. **Optional architectural follow-ons**
   - Document, but do not prematurely ship, hierarchical retrieval, hybrid
     vector/keyword search, and query expansion until the audit proves they are
     needed.

## Acceptance Criteria

1. The team can quantify chunk-quality issues with artifacts, not anecdotes.
2. Rechunking rules are explicitly documented and test-backed.
3. Coverage and query sensitivity reports identify where retrieval is fragile.
4. The retrieval roadmap after this sprint is driven by evidence.

## Verification

- Add script-backed audit artifacts committed to `release/` or a governed audit
  location.
- Add regression coverage for chunk metadata shape if the index contract changes.
- Compare representative retrieval outputs before and after rechunking.

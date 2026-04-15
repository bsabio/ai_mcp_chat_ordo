# Sprint 4 — Two-Stage Retrieval, Related Sections, And Slug Integrity

> **Status:** Completed
> **Goal:** Make locate-then-read the default retrieval path and enrich section
> payloads with navigable, canonical adjacent context.

## Problem

`search_corpus` can already prefetch the top section in some cases, but the
default system contract still lets the agent answer from search summaries or
flat section text when richer source-grounded behavior should be automatic.

## Primary Areas

- `src/core/use-cases/tools/CorpusTools.ts`
- `src/core/use-cases/tools/get-section.tool.ts`
- canonical corpus-reference helpers
- chat policy and eval runner

## Tasks

1. **Two-stage retrieval by default**
   - Treat `search_corpus` as the locate step and `get_section` as the read
     step.
   - Automatically prefer full-section reads for strong matches.

2. **Structured `get_section` payload**
   - Replace plain string return with a structured payload including title,
     book/chapter metadata, canonical path, content, truncation state, and any
     surrounding context needed by the agent.

3. **Related sections**
   - Add 2–3 semantically adjacent sections to the `get_section` response.
   - Prioritize cross-book connections when they are genuinely relevant.

4. **Slug integrity**
   - Ensure every citation target resolves canonically or degrades safely to a
     search path/null instead of dead-linking.

5. **Authenticated and anonymous behavior**
   - Preserve current access boundaries while improving the contract shape.
   - Anonymous users should still receive safe canonical metadata where allowed.

## Acceptance Criteria

1. Strong corpus matches are answered from full-source content by default.
2. `get_section` returns structured metadata plus `related_sections`.
3. Broken citation slugs cannot be rendered as dead links.
4. Existing access rules remain intact.

## Verification

- Update tool tests for the new `get_section` payload shape.
- Add canonical-link regression tests.
- Add eval scenarios that prove strong matches auto-read and partial matches do
  not overclaim completeness.
# Sprint 4 Style Consolidation And QA

- Date: 2026-03-26
- Routes: `/blog`, `/blog/meet-studio-ordo-the-ai-advisor-built-for-how-businesses-actually-work`
- Server: `http://localhost:3001`
- Screenshots:
  - `sprint-4-journal-index-qa.png`
  - `sprint-4-journal-article-qa.png`

## Verified Changes

1. The stale legacy `.journal-*` block was removed from `src/app/globals.css`, leaving journal layout authority with the shared typed primitives in `src/components/journal/JournalLayout.tsx` plus the small number of still-live route globals.
2. The final journal index continues to render as a ruled publishing surface rather than a product landing page: the live HTML exposes `data-journal-role="lead-entry"` plus `data-journal-region="essays"` and `data-journal-region="briefings"` for the section split.
3. The article route now renders the real owner-controlled LinkedIn destination from `config/identity.json`, and the link remains quiet and subordinate to the reading sequence rather than becoming promotional chrome.
4. Future distribution readiness remains structural rather than decorative: the article opener preserves room for later metadata expansion without reintroducing issue theater, card framing, or a separate promotional rail.

## Removed Or De-Authorized Styling

1. Removed the legacy `.journal-*` selectors that previously owned older intro-card, feature-card, archive-card, hero-image, and article-body styling paths.
2. Retained only the still-live route globals needed by the current system, including `.editorial-page-shell` and `.blog-article-prose`.
3. Confirmed the live journal routes are now driven by explicit primitive contracts such as `data-journal-role`, `data-journal-layout`, `data-journal-entry-tone`, and article-role hooks instead of depending on the removed global journal class layer.

## Verification

1. Focused tests passed: `npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx tests/sprint-7-blog-pipeline.test.ts`
2. Production build passed: `npm run build`
3. Live index HTML inspection confirmed the section hooks `data-journal-region="essays"`, `data-journal-region="briefings"`, and `data-journal-role="lead-entry"`.
4. Live article HTML inspection confirmed the real LinkedIn link was rendered from config: `https://www.linkedin.com/in/keithwilliams5/`.
5. Browser screenshots were captured with Playwright CLI for both the index and article routes.

## QA Notes

1. What was removed: the stale global journal class system that duplicated responsibilities already owned by shared journal primitives.
2. What still feels decorative: nothing material in the journal-owned surface after Sprint 4; the remaining visual system is mostly rules, spacing, and typography.
3. Reading-surface assessment: `/blog` now reads like an index and `/blog/[slug]` reads like a restrained article surface rather than a product landing page.

# Sprint 3 Article Reading Experience

- Date: 2026-03-26
- Route: `/blog/meet-studio-ordo-the-ai-advisor-built-for-how-businesses-actually-work`
- Server: `http://localhost:3001`

## Verified Changes

1. The article opener now uses a factual metadata row and a quiet identity rail instead of pill metadata, gradient shell treatment, and a boxed `Article details` panel.
2. The standfirst now appears immediately after the header so reading begins before any optional hero treatment.
3. Duplicate opener copy is suppressed when the article description matches the extracted standfirst, so the route does not repeat the same sentence as both dek and standfirst.
3. Essay and briefing openers now expose explicit section-aware tone through the shared header contract instead of relying on one generic article template.
4. Longform ornaments remain shared through `MarkdownProse`, but the pull-quote, side-note, and article-body surfaces are now flatter and more consistent with the journal's ruled, reading-first direction.
5. Journal date formatting now uses UTC on article and index surfaces so publication dates do not drift by local timezone.

## Identity Notes

1. The route now supports an optional owner-controlled LinkedIn link through `identity.linkedInUrl`.
2. The current workspace configuration now provides the real owner-controlled LinkedIn URL, so the live article route can exercise the identity-link path without inventing a destination.

## Verification

1. Focused tests passed: `npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx`
2. Live SSR inspection of `/blog/meet-studio-ordo-the-ai-advisor-built-for-how-businesses-actually-work` confirmed the reconciled opener contract: `data-journal-role="article-header"`, `data-journal-article-tone="essay"`, factual metadata row, standfirst before body, no duplicated dek/standfirst sentence, and no `Article details` or `Journal article` text.
3. Screenshot captured: `sprint-3-article-reading-experience.png`
4. The shared browser MCP profile remained locked during this pass, so the screenshot was recorded with `npx playwright screenshot` instead of the MCP browser tool.

## Remaining Observations

1. The implementation is aligned with Sprint 3 and the owner identity link is now live-configured.
2. The remaining operational limitation is only the shared MCP browser-profile lock; CLI capture remains the fallback for feature-owned screenshots.
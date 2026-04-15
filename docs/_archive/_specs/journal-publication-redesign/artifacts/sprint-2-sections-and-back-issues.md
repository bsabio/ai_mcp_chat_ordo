# Sprint 2 Sections And Back Issues

- Date: 2026-03-26
- Route: `/blog`
- Server: `http://localhost:3001`
- Screenshot: `sprint-2-sections-and-back-issues.png`

## Verified Changes

1. Cross-shelf duplication is removed. Essays and briefings now derive only from their real classified shelves instead of silently backfilling from the opposite section.
2. The intro now uses factual metadata only. Fake issue rhetoric, decorative chips, and publication theater have been removed.
3. The essay shelf now reads as a slower longform lane with larger type and more open rhythm, while briefings read as compact operational rows.
4. The archive has been rebuilt as a chronology-first back-issues list. Live shelf entries no longer repeat there, and repeated hero-image cards are no longer doing the structural work.

## Archive Notes

1. The archive still carries section identity through the kicker, but chronology is now the dominant organizing signal.
2. When a shelf is empty, the page now says so plainly instead of fabricating balance.
3. The overall surface is materially flatter and more typographic than the earlier card-heavy pass.

## Verification

1. Focused test passed: `npx vitest run tests/blog-hero-rendering.test.tsx`
2. Browser screenshot captured with Playwright from `/blog` after the Sprint 2 implementation landed.
# Sprint 1 Cover Composition

- Date: 2026-03-26
- Route: `/blog`
- Server: `http://localhost:3001`
- Screenshot: `sprint-1-cover-composition.png`
- Runtime metadata:
  - router type: `app`
  - page files: `app/layout.tsx`, `app/blog/page.tsx`

## Historical Framing Note

1. Sprint 1 landed before the later Swiss/index correction tightened the target away from issue-style framing.
2. References below to `issue line`, `cover`, or `editorial support copy` describe what changed at that stage. They are historical evidence, not the final target vocabulary.

## Current Alignment Note

1. Sprint 1 has since been reconciled against the stricter Swiss/index contract.
2. The current opening no longer uses explanatory lead-support copy, `Lead` labeling, or hero-placeholder text to justify the first row.
3. The opening is now judged by factual sequencing, typography, and ruled structure rather than by cover-story rhetoric.

## Verified Changes

1. The old split intro with `Issue desk` and the right-rail `Journal at a glance` ledger has been removed.
2. The masthead now opens as a factual journal header with compact metadata instead of a secondary sidebar card.
3. The lead story follows immediately after the header and now reads as the first ruled entry in the index sequence.
4. The lead remains distinct from shelf rows through hierarchy and optional image support, not through dedicated support copy or theatrical framing.

## Remaining Observations

1. The page hierarchy is materially stronger than the Sprint 0 baseline, but Sprint 2 remains responsible for making essay, briefing, and archive rhythm unmistakably different.
2. Shared shell and floating chat are quiet enough now that the dominant remaining work after Sprint 1 is section differentiation and archive behavior, not shell suppression.

## Verification

1. Focused test passed: `npm exec vitest run tests/blog-hero-rendering.test.tsx`
2. Browser evidence for the original screenshot remains historical. Current Sprint 1 alignment should be judged by the reconciled implementation and focused regression assertions.

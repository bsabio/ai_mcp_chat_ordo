# Sprint 0 Blog Index Baseline

- Date: 2026-03-26
- Route: `/blog`
- Server: `http://localhost:3001`
- Screenshot: `sprint-0-blog-index-baseline.png`
- Runtime metadata:
  - router type: `app`
  - page files: `app/layout.tsx`, `app/blog/page.tsx`

## Historical Framing Note

1. This artifact captures the real Sprint 0 baseline before the later Swiss/index direction correction.
2. Terms such as `cover story` or `publication cover` below reflect the baseline UI and the vocabulary in use at capture time. They should not be read as the current target language for the redesign.

## Verified Visible Structure

1. Global shell remains present with the primary nav, account menu, footer, and floating chat launcher.
2. The journal intro still opens with a split masthead plus a right-hand "Journal at a glance" ledger.
3. The lead story sits below the intro block, not inside the same first-screen composition.
4. The lead story currently classifies as a practical briefing and carries "Cover story" support text in the captured baseline UI.
5. The essay shelf and practical briefings shelf are both present, followed by archive navigation and back issues.

## Baseline Assessment

1. Sprint 0 shell quieting is visible because the nav and floating launcher recede instead of dominating the route.
2. The page still reads as a journal system in transition rather than a disciplined index or finished reading surface.
3. The strongest remaining problem is compositional: the intro ledger and masthead still consume the opening hierarchy before the lead story arrives.
4. Section logic is present, but the current content set is thin and exposes duplication pressure between essay and briefing shelves.

## Console Notes

1. One browser error was observed from the chat event stream being interrupted during page load: `/api/chat/events?...` connection interrupted.
2. Font preload warnings appeared after load.
3. No Next.js runtime route error was reported for `/blog`.

## Follow-on Design Implications

1. Sprint 1 was correctly aimed at collapsing the masthead and lead feature into one first-screen sequence.
2. Sprint 2 should prevent thin-content duplication from weakening the essay vs briefing distinction.
3. Floating chat is no longer visually dominant, so the next work should focus on publication hierarchy rather than shell suppression.

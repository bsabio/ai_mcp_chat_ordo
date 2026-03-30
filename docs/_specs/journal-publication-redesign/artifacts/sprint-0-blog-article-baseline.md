# Sprint 0 Blog Article Baseline

- Date: 2026-03-26
- Route: `/blog/everything-studio-ordo-can-do-a-complete-capabilities-overview`
- Server: `http://localhost:3001`
- Screenshot: `sprint-0-blog-article-baseline.png`
- Runtime metadata:
  - router type: `app`
  - page files: `app/layout.tsx`, `app/blog/[slug]/page.tsx`

## Historical Framing Note

1. This artifact captures the real Sprint 0 article baseline before the later Swiss/index direction correction.
2. References below to `publication` tone or opener quality should be read as historical observations, not as a requirement to reintroduce decorative editorial framing.

## Verified Visible Structure

1. The article route keeps the quiet shell, persistent nav, footer, and non-dominant floating chat launcher.
2. The article opener includes publication kicker, section label, reading time, title, dek, article details row, hero figure, and standfirst.
3. The body renders structured markdown patterns correctly, including headings, lists, tables, and a lead note blockquote.
4. The current representative article is operational and capability-heavy, so the route is exercising the practical briefing mode more than a reflective essay mode.

## Baseline Assessment

1. The article route is substantially more disciplined than the index and reads as a structured reading surface rather than a generic markdown dump.
2. The opener is still metadata-forward in tone because the article details cluster competes with the title and dek rather than disappearing into a quieter editorial frame.
3. The body structure is credible for a briefing, but this baseline does not yet prove that essays and briefings feel compositionally different on the same route.
4. Hero, standfirst, and body spacing are stable enough to serve as the baseline before Sprint 3 article refinements.

## Console Notes

1. No browser errors were reported on this article capture.
2. A Largest Contentful Paint warning flagged `/ordo-avatar.png`, which appears unrelated to the article body and likely comes from shared shell or account chrome.
3. Font preload warnings appeared after load.

## Follow-on Design Implications

1. Sprint 3 should reduce the visible weight of the article details block and strengthen the distinction between essay and briefing openers without reintroducing decorative rhetoric.
2. If article pages keep shared shell chrome, the above-the-fold shell image contribution should be reviewed so it does not interfere with publication perception or performance diagnostics.
3. This route is a good baseline for verifying that future longform ornament changes do not regress markdown rendering quality.

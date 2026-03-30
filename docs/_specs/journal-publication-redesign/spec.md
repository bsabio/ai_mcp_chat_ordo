# Journal Publication Redesign - Architecture Spec

> **Status:** Draft
> **Date:** 2026-03-26
> **Scope:** Re-architect the public journal index and article experience so it reads as a disciplined, factual publishing surface rather than a product dashboard with editorial styling. This work covers the canonical public `/journal` index, public `/journal/[slug]` article route, legacy `/blog` compatibility redirects, journal-specific layout primitives, journal classification, journal identity/distribution hooks, editorial shell behavior on journal routes, and visual/browser verification for publication quality.
> **Dependencies:** Shell Navigation And Design System (implemented), Homepage Chat Shell (implemented), FAB Shell Refactor (implemented), Blog Article Production Pipeline (implemented), Browser UI Hardening (available for verification patterns)
> **Affects:** `src/app/journal/page.tsx`, `src/app/journal/[slug]/page.tsx`, `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/components/journal/JournalLayout.tsx`, `src/components/MarkdownProse.tsx`, `src/lib/blog/journal-taxonomy.ts`, `src/app/globals.css`, shell-level route presentation where journal routes currently inherit product-chrome emphasis, outward identity links for the journal surface, and focused journal/browser tests.
> **Motivation:** The current journal has improved structurally, but the rendered page still fails its core product promise. The public journal looks like application UI trying to perform publication authority through decorative rhetoric. It relies on card atmosphere, soft gradients, and invented editorial framing where strict hierarchy, factual metadata, and typographic discipline should be doing the work. This is not a copy tweak problem. It is a product-surface architecture problem.
> **Requirement IDs:** `JPR-010` through `JPR-123`

---

## 1. Problem Statement

### 1.0 Direction Correction - 2026-03-26

This redesign now has an explicit direction correction.

The journal should move toward a stricter Swiss/index model:

1. flatter surfaces
2. stronger rules and spacing
3. factual metadata only
4. less editorial theater
5. stronger typographic hierarchy
6. list and ledger behavior before card behavior `[JPR-025]`

Previous language about cover-story drama or issue-style framing should be treated as provisional where it conflicts with product truth, clarity, and restraint. `[JPR-026]`

### 1.1 Verified Experience Defects

The current journal implementation has the following verified defects:

1. The first screen is dominated by a masthead card and issue bookkeeping rather than a compelling cover-story entry. `[JPR-010]`
2. The top intro composition forces the journal headline into a narrow, column-like stack that reads as a sidebar instead of a publication masthead. `[JPR-011]`
3. The visual language mixes application chrome and editorial rhetoric: pills, glass shell surfaces, and ledger blocks compete with the publication surface rather than receding behind it. `[JPR-012]`
4. The lead story is conceptually important but compositionally subordinate because the masthead consumes the opening hierarchy. `[JPR-013]`
5. Essays and practical briefings are classified differently in code but still feel too similar visually, which weakens the publication's section logic. `[JPR-014]`
6. The archive still behaves like a card gallery rather than a back-issues system or chronological reading aid. `[JPR-015]`
7. The public article route has a stronger header than before, but it still lacks a fully publication-grade opening sequence that distinguishes reflective essays from practical briefings. `[JPR-016]`
8. Journal styling authority is split across shared globals and utility-heavy local primitives, making iteration harder and visual drift more likely. `[JPR-017]`
9. The journal still uses implied issue mechanics and editorial rhetoric in places where the product does not yet have a real issue model. `[JPR-018]`
10. The current surface does not yet express real publisher identity and outbound credibility clearly enough, including a factual owner-controlled social link such as LinkedIn. `[JPR-019]`
11. The article system does not yet account for future transformation of articles into audio episodes and machine-readable podcast feeds. `[JPR-020]`

### 1.2 Root Cause

The journal has been approached as a themed page inside the product shell rather than as a distinct publication surface with its own compositional contract.

The missing architectural layer is a **publishing system** that can answer all of the following coherently:

1. What constitutes the journal masthead
2. What belongs on the first screen of the journal index
3. Whether the newest article should read as a restrained lead entry instead of a theatrical cover feature
4. How journal routes should quiet the surrounding product shell
5. Which content patterns belong to longform reading vs operational scanning
6. Which visual decisions live in reusable primitives versus journal-specific global CSS
7. How real publisher identity and future distribution metadata should surface without marketing noise `[JPR-021]`

Without that layer, each redesign pass keeps improving local components while the overall page still communicates the wrong product identity. `[JPR-021]`

### 1.3 Why This Matters

The journal is a public-facing expression of the product's intelligence, seriousness, and taste. If it feels like a dashboard wrapped in publication language, then it weakens credibility in exactly the place where the product is trying to demonstrate discernment.

From an engineering perspective, this is also now a systems problem:

1. The shell architecture has already been stabilized to prevent menu regressions. `[JPR-022]`
2. The journal now has shared layout primitives and derived taxonomy. `[JPR-023]`
3. The remaining failures are therefore not isolated page bugs. They are failures in the publication contract itself. `[JPR-024]`

---

## 2. Design Goals

1. **Swiss/index discipline.** The journal index must read as a strict, factual publishing surface with clear rules, spacing, and typographic hierarchy rather than decorative editorial atmosphere. `[JPR-030]`
2. **Restrained lead-entry authority.** The newest or most important article may lead the page, but it should do so through sequence and hierarchy rather than theatrical cover treatment. `[JPR-031]`
3. **Distinct reading modes.** Essays, practical briefings, and archive entries must each have distinct visual rhythms, densities, and interaction patterns. `[JPR-032]`
4. **Quiet shell, loud content.** Product shell chrome must recede on journal routes so the publication surface owns the page atmosphere. `[JPR-033]`
5. **Reusable editorial primitives.** Journal layout and article patterns must be shared, typed, and reusable rather than page-local one-offs. `[JPR-034]`
6. **Operationally honest archive.** The archive must feel like back issues and chronology, not a miscellaneous card feed. `[JPR-035]`
7. **Longform credibility.** Article pages must support strong opening sequences, standfirsts, pull quotes, side notes, and figure variants without collapsing back into generic markdown output. `[JPR-036]`
8. **Browser-verifiable aesthetics.** This feature cannot be considered complete via static JSX inspection alone; browser rendering and screenshot review must be part of verification. `[JPR-037]`
9. **Factual identity.** The journal and article routes should expose real publisher identity without marketing fluff, including an owner-controlled LinkedIn link. `[JPR-038]`
10. **Distribution readiness.** The article surface and metadata model should not block later conversion of articles into podcast episodes and podcast feeds for Spotify and other platforms. `[JPR-039]`

### 2.1 Design Prohibitions

The redesign should also be judged against explicit prohibitions.

Do not introduce the following unless a later persisted content model makes them true and necessary:

1. fictional issue labels, issue numbers, seasons, or editorial-package terminology `[JPR-045]`
2. decorative chips or tag clusters that do not carry necessary information `[JPR-046]`
3. gradients, glass, blur, or card stacks used as a substitute for hierarchy `[JPR-047]`
4. long support copy explaining why a section or lead entry matters `[JPR-048]`
5. archive presentations that repeat live shelf entries on the same page `[JPR-049]`

---

## 3. Architecture Direction

### 3.1 Publication Surface Contract

Introduce an explicit contract for journal route composition that separates publishing surfaces from generic application surfaces.

At minimum the system should distinguish:

1. journal index header
2. lead entry
3. essay shelf
4. briefing shelf
5. back-issues archive
6. article opening sequence
7. longform body ornaments such as standfirst, pull quote, side note, and figure variants
8. factual identity / distribution rail where appropriate `[JPR-040]`

Rules:

1. The first screen of `/journal` must include the header and the beginning of the lead entry or first meaningful row. `[JPR-041]`
2. Journal route primitives must define hierarchy through type, rules, spacing, and rhythm before relying on cards, gradients, or ornamental surfaces. `[JPR-042]`
3. Publication primitives must be reusable by both the index and the public article route. `[JPR-043]`
4. The index must not imply an issue, edition, or editorial package unless the product has a real persisted model for it. `[JPR-044]`
5. The default journal index should still work as a strict ruled list when imagery is absent or sparse. `[JPR-045A]`

### 3.2 Lead Entry Contract

The lead entry needs a dedicated contract rather than a slightly larger generic feature card.

Rules:

1. The lead entry may be larger than surrounding rows, but it must remain restrained and factual. `[JPR-050]`
2. Sequence should do most of the work; spectacle should do very little. `[JPR-051]`
3. Support copy for the lead must remain informational, not editorial theater. `[JPR-052]`
4. The lead entry should degrade gracefully when no hero image exists and should not depend on imagery for authority. `[JPR-053]`
5. The lead entry must still read as part of an index system rather than a separate landing-page hero. `[JPR-054]`

### 3.3 Section System Contract

The journal already derives essay vs briefing classification. That classification must now control layout behavior, not just labels.

Rules:

1. Essays should use slower, larger, more literary presentation. `[JPR-060]`
2. Briefings should use denser, more operational presentation optimized for scanning. `[JPR-061]`
3. The archive should preserve section identity but prioritize chronology and issue continuity. `[JPR-062]`
4. The derived taxonomy may remain heuristic in this feature, but the UI must treat section identity as first-class. `[JPR-063]`
5. Rows and ledgers should be preferred over decorative cards when the content model is fundamentally index-like. `[JPR-064]`
6. If archive content appears on the same page as live shelves, archive groups must exclude entries already promoted into those shelves. `[JPR-065]`

### 3.4 Article Opening Contract

The public article route needs a more structured opening sequence than title + hero + markdown body.

Rules:

1. Article headers must include section identity and reading-time context. `[JPR-070]`
2. Standfirsts must remain distinct from the body and visibly read as a publication opener. `[JPR-071]`
3. Essays and briefings may share the same route but should not feel compositionally identical. `[JPR-072]`
4. Pull quotes, side notes, and figure variants must be handled by shared journal primitives through the markdown renderer. `[JPR-073]`
5. Article headers should expose real publisher identity in a restrained way, including space for an owner-controlled LinkedIn link. `[JPR-074]`
6. Article metadata and layout should preserve room for later audio-episode and podcast-feed metadata without forcing a redesign when that feature ships. `[JPR-075]`
7. Article openers should be short enough that body copy begins quickly on desktop without a large decorative dead zone. `[JPR-076]`

### 3.5 Shell Quieting Contract

Journal pages currently inherit product shell emphasis that competes with publication atmosphere.

Rules:

1. Journal routes may not remove the global shell, but shell emphasis must be reduced relative to the journal content surface. `[JPR-080]`
2. Navigation chrome should remain usable while becoming visually quieter on journal routes. `[JPR-081]`
3. Floating chat affordances should not visually dominate the journal front page. If they remain present, their interaction with the journal surface must be intentionally reviewed. `[JPR-082]`

### 3.6 Styling Authority Contract

The journal should not continue to drift between old global journal CSS and new utility-heavy components.

Rules:

1. Shared journal styling authority must be consolidated into one clear contract. `[JPR-090]`
2. Legacy journal CSS that is no longer authoritative should be removed or explicitly deprecated after replacement. `[JPR-091]`
3. Token decisions for journal typography, spacing, and atmosphere should be journal-specific where necessary but still respect the app's base design system. `[JPR-092]`

### 3.7 Identity And Distribution Contract

The journal should express real publisher identity and remain extensible for later cross-channel publishing.

Rules:

1. Article and journal routes should support factual owner identity links, with LinkedIn treated as the first required external profile. `[JPR-093]`
2. Identity links must be quiet, useful, and subordinate to the reading experience. `[JPR-094]`
3. The article model and route composition should not block later creation of audio episodes derived from article content. `[JPR-095]`
4. Future podcast-feed generation for Spotify and other platforms must be able to derive from stable article metadata, canonical routes, and real publication dates. `[JPR-096]`
5. This redesign does not need to implement podcast distribution yet, but it must avoid structural choices that make that future feature harder. `[JPR-097]`

---

## 4. Security And Product Truthfulness

This is primarily a publication and design-system feature, but several product-truth constraints apply.

1. Derived taxonomy labels must not imply editorial metadata that is explicitly stored when it is actually inferred. `[JPR-100]`
2. Journal ledger or issue labels must not present fictional publication mechanics if no true issue model exists. `[JPR-101]`
3. Archive navigation must reflect real post chronology and real route destinations only. `[JPR-102]`
4. Publication ornamentation must not compromise accessibility semantics, reading order, or keyboard navigation. `[JPR-103]`
5. Outbound identity links must resolve to real owner-controlled destinations only. `[JPR-104]`
6. Future podcast or audio metadata must derive from real article metadata and may not invent duration, episode numbering, or distribution state. `[JPR-105]`
7. Journal and article copy must prefer factual labels over rhetorical framing when both can express the same information. `[JPR-106]`

---

## 5. Testing Strategy

The implementation must add or update tests for the following:

1. Journal index rendering for header, lead entry, section shelves, and archive structure. `[JPR-110]`
2. Distinct rendering contracts for essay vs briefing entries where the section system changes card semantics. `[JPR-111]`
3. Public article header rendering with section identity and reading-time metadata. `[JPR-112]`
4. Markdown-driven journal patterns for standfirsts, pull quotes, side notes, and figure variants. `[JPR-113]`
5. Browser verification of the rendered journal index and article routes, including screenshot review or explicit DOM assertions tied to the publication contract. `[JPR-114]`
6. Shell persistence and route integrity during journal redesign so navigation regressions do not recur, including explicit assertions for journal-route shell surface, nav tone, and floating chat tone hooks. `[JPR-115]`
7. Journal index assertions should verify that fictional issue framing is absent when no persisted issue model exists. `[JPR-116]`
8. Journal index assertions should verify that archive groups do not repeat live shelf entries on the same page. `[JPR-117]`
9. When identity links are added, they should be covered by focused article-route assertions to ensure LinkedIn or equivalent profile destinations remain wired correctly. `[JPR-118]`
10. When article-to-audio and podcast-feed support is implemented later, feed metadata and enclosure generation should be tested independently from visual journal tests. `[JPR-119]`

Target verification remains:

```bash
npm exec vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx tests/sprint-7-blog-pipeline.test.ts
npm run build
```

Browser verification should also be recorded as feature-owned evidence when substantive design changes land. `[JPR-120]`

Sprint 0 establishes the baseline evidence workflow for the canonical `/journal` surface; early baseline captures may still reference the historical `/blog` route tree that predated cutover. Later sprints should attach screenshots and DOM notes under `docs/_specs/journal-publication-redesign/artifacts/` whenever publication hierarchy or shell emphasis changes materially. `[JPR-120]`

Minimum browser QA notes for each substantive design change should include:

1. what was intentionally removed
2. whether any fictional framing remains
3. whether live shelves and archive are visibly distinct
4. whether identity or distribution affordances remain subordinate to reading `[JPR-121]`

---

## 6. Sprint Plan

| Sprint | Goal |
| --- | --- |
| Sprint 0 | Audit the current journal failure modes, define the publication contract, and quiet shell interference on journal routes |
| Sprint 1 | Rebuild the journal index masthead and lead-entry composition so the first screen reads like a strict publishing index |
| Sprint 2 | Differentiate essays, briefings, and archive behavior into distinct section systems and back-issues presentation |
| Sprint 3 | Upgrade the article route into a disciplined reading experience with section-aware openings, factual identity, and richer longform patterns |
| Sprint 4 | Consolidate styling authority, capture browser evidence, and preserve distribution readiness for social/profile links and future audio publishing |

---

## 7. Future Considerations

The following items are explicitly out of scope for this feature but should be recorded for later consideration:

1. Persisted editorial taxonomy fields on blog posts instead of heuristics
2. Explicit issue models with issue numbers, seasons, or editorial packages
3. Dedicated section landing pages for essays and briefings
4. Journal-specific shell mode or alternate navigation chrome for full publication immersion
5. Article-series linking, related-reading rails, or contributor systems
6. Article-to-audio generation that turns a published article into a podcast episode source object
7. Machine-readable podcast feeds and platform syndication for Spotify and other distributors
8. Expanded publisher identity surfaces beyond LinkedIn when there is a real need for them
9. Persisted issue mechanics, if the product later chooses to add a true issue model rather than implied framing

# Sprint 3 - Article Reading Experience

> **Goal:** Upgrade the public article route into a disciplined reading experience with section-aware openings, factual identity, and strong longform patterns.
> **Spec ref:** `JPR-034`, `JPR-036`, `JPR-070` through `JPR-075`, `JPR-112`, `JPR-113`, `JPR-117`
> **Prerequisite:** Sprint 2
> **Test count target:** Markdown and article-route journal tests remain green with added section-aware assertions as needed.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/blog/[slug]/page.tsx` | Public article route already renders `JournalArticleHeader`, `JournalHeroFigure`, `JournalStandfirst`, and `JournalArticleBody` |
| `src/components/MarkdownProse.tsx` | Markdown renderer already supports journal variant handling for blockquotes, tables, figures, and side notes |
| `src/components/journal/JournalLayout.tsx` | Shared primitives already define article header, figure, standfirst, pull quote, side note, and body surfaces |
| `src/lib/blog/journal-taxonomy.ts` | `describeJournalPost(post)` and `splitJournalStandfirst(markdown)` provide section identity and opening extraction |
| `src/components/MarkdownProse.test.tsx` | Focused markdown journal-pattern regression coverage already exists |

## QA Findings Before Reconciliation

1. The article route already has the right structural pieces, but the opener still behaves like a decorated content template: gradient shell treatment, pill metadata, and a boxed `Article details` panel keep the top of the page more theatrical than factual.
2. The current article test coverage proves hero rendering and metadata, but it does not directly enforce the Sprint 3 opener contract: section-aware tone, concise metadata, identity-link support, or the standfirst appearing before the hero/body sequence.
3. Longform ornaments already exist, but their contract is still implicit in styling rather than explicit in the shared primitives and tests.

---

## Task 3.1 - Build a stronger article opening sequence

**What:** Make the article header, standfirst, and hero sequence feel like a real publication opener rather than a generic content template.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/blog/[slug]/page.tsx` |
| **Modify** | `src/components/journal/JournalLayout.tsx` |
| **Spec** | `JPR-070` through `JPR-072`, `JPR-112` |

### Task 3.1 Notes

The opening should make section identity obvious and may vary subtly between essays and briefings if that improves readability.

This sprint should also remove decorative publication rhetoric from the article opener. Metadata, byline, and supporting context should read as factual and restrained.

Where author or publisher identity appears, it should support a real outbound profile link. LinkedIn is the first required external destination when this work lands in code and config.

Acceptance criteria for the opener:

1. the title block does not consume excessive vertical space before body copy begins
2. the standfirst reads as a short opener, not a second marketing deck
3. section, date, reading time, and identity link can be scanned quickly without decorative framing
4. the body begins high enough on desktop that the route still feels like reading, not landing-page theater

### Task 3.1 Verify

```bash
npm exec vitest run tests/blog-hero-rendering.test.tsx
```

---

## Task 3.2 - Refine longform patterns into a stable editorial grammar

**What:** Strengthen pull quotes, side notes, figure variants, and other longform ornaments so they feel like part of one reading system.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/MarkdownProse.tsx` |
| **Modify** | `src/components/journal/JournalLayout.tsx` |
| **Modify** | `src/components/MarkdownProse.test.tsx` as needed |
| **Spec** | `JPR-034`, `JPR-073`, `JPR-113` |

### Task 3.2 Notes

This sprint is not about adding every possible ornament. It is about making the existing set feel coherent, durable, and publication-grade.

Longform patterns should remain compatible with a later feature that derives an audio episode from an article. Do not hard-code layout assumptions that make later audio metadata, transcript links, or episode references awkward to add.

Specific constraints:

1. pull quotes should interrupt reading intentionally, not inflate page drama
2. side notes should remain subordinate to the body and never look like ad rails
3. figure treatments should work even when there is only one image or no image at all
4. any future audio or feed metadata should fit below the opener or near the article footer without reworking the body structure

### Task 3.2 Verify

```bash
npm exec vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx
```

---

## Completion Checklist

- [x] Article opener feels factual, concise, and reading-first
- [x] Section identity is legible on the article route
- [x] Longform patterns read as one editorial grammar
- [x] Article identity supports a real LinkedIn link when configured, without visual clutter
- [x] Article structure remains compatible with later audio-episode and podcast-feed metadata

## QA Deviations
- Browser evidence is now captured in the Sprint 3 artifact, but the shared browser MCP profile remained locked; the screenshot was recorded with the local Playwright CLI instead.

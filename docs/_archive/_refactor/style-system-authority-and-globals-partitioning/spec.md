# Style System Authority And Globals Partitioning — Refactor Spec

> **Status:** Completed
> **Date:** 2026-03-26
> **Scope:** Add CSS guardrails, reduce style-authority drift between global CSS and component-owned styling, and split `src/app/globals.css` by concern without regressing live surfaces.
> **Affects:** `src/app/globals.css`, `src/app/styles/*.css`, shared journal/editorial components, style linting and quality scripts, and focused visual or rendering regression coverage tied to the affected surfaces

---

## 1. Problem Statement

Styling authority is currently too centralized in one large global stylesheet
while still leaking responsibility into component-local class composition.

Verified evidence:

1. The repository started with exactly one authored CSS file:
   `src/app/globals.css`.
2. That file mixed design tokens, shell primitives, utilities, chat surfaces,
   journal/editorial rules, and page-specific styles in one authority layer.
3. The journal audit already confirmed drift between `globals.css` and
   component-level styling in `src/components/journal/JournalLayout.tsx` and
   `src/components/MarkdownProse.tsx`.
4. Until now, the repo had no dedicated CSS lint guardrail, which made it too
   easy for style churn to accumulate without a focused check.

Result: styling changes are harder to reason about, ownership boundaries are not
obvious, and safe dead-rule cleanup is slower than it should be.

Current progress:

1. Sprint 0 guardrails are in place through `stylelint.config.mjs` and
   `npm run lint:css`.
2. Sprint 1 extracted three real partitions under `src/app/styles/`:
   `foundation.css`, `shell.css`, and `utilities.css`.
3. Sprint 2 extracted editorial, library, and prose authority into
   `src/app/styles/editorial.css`.
4. Sprint 3 extracted the remaining interactive surfaces into
   `src/app/styles/chat.css` and `src/app/styles/jobs.css`.
5. `src/app/globals.css` now acts strictly as the ordered entrypoint plus the
   Tailwind dark variant declaration.

---

## 2. Design Goals

1. Establish one clear authority contract for shared styling.
2. Keep design tokens and utility layers reusable while separating them from
   feature-owned surfaces.
3. Partition `globals.css` by concern so future edits are localized and easier
   to review.
4. Add a CSS lint guardrail that understands the repo's Tailwind v4-style
   directives.
5. Remove dead or duplicated rules only after replacement ownership is proven.
6. Preserve the current live UI behavior while the file is being decomposed.

---

## 3. Architecture Direction

### 3.1 Style Authority Contract

Shared styling should be separated into explicit layers.

Target concerns:

1. design tokens and root variables
2. shell and layout primitives
3. reusable utilities and helper classes
4. editorial and journal surfaces
5. chat and jobs surfaces
6. route-specific exceptions that cannot yet be generalized

The global entrypoint may remain `src/app/globals.css`, but it should become an
aggregator rather than the long-term home of every rule.

That target state is now in place through six concern-owned partitions under
`src/app/styles/`.

### 3.2 Partitioning Contract

Each partition should answer one question clearly:

1. what concern it owns
2. which routes or components consume it
3. whether the rules are reusable system primitives or feature-owned surfaces

If a rule is feature-owned and only relevant to a small area, it should not sit
beside unrelated shell or token rules indefinitely.

### 3.3 Linting Contract

The repo needs a dedicated CSS lint path that remains compatible with the
existing Tailwind v4-style directives.

Minimum rules:

1. lint authored CSS under `src/app/**/*.css`
2. ignore the known Tailwind-specific at-rules used by this repo
3. run as a first-class script so it can be used in local QA and CI

### 3.4 Removal Contract

Dead-rule cleanup must remain proof-driven.

Rules may be removed only when at least one of the following is true:

1. code search confirms no live references and no runtime ownership path
2. an equivalent replacement rule or primitive is already in place
3. focused regression coverage or browser QA confirms the surface still renders
   correctly

---

## 4. Verification Strategy

| Category | Minimum evidence |
| --- | --- |
| CSS lint | `npm run lint:css` passes |
| Rendering regression | focused tests for the touched surface remain green |
| Build safety | `npm run build` passes after structural CSS changes |
| Visual confidence | browser QA or feature-owned screenshots when hierarchy or layout changes materially |

Expected verification commands will vary by sprint, but the baseline includes:

```bash
npm run lint:css
npx vitest run src/components/MarkdownProse.test.tsx tests/blog-hero-rendering.test.tsx
npm run build
```

---

## 5. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Establish lint guardrails and document the current authority map |
| 1 | Split foundational tokens, shell primitives, and shared utilities by concern |
| 2 | Extract editorial, journal, and prose styling into clearer shared ownership |
| 3 | Partition chat and jobs surfaces, remove proven dead rules, and close with regression QA |

---

## 6. Done Criteria

1. The repo has a working CSS lint script and config.
2. `src/app/globals.css` is no longer a monolithic mixed-authority file.
3. Shared tokens, utilities, and feature-owned surfaces have clearer boundaries.
4. Duplicated styling paths between globals and component-owned markup are
   reduced or eliminated.
5. Focused regression tests and build verification remain green after the
   partitioning work lands.

Completion evidence:

1. `npm run lint:css` passes.
2. Focused journal, jobs, and browser chat regressions pass.
3. `npm run build` passes with `src/app/globals.css` reduced to the entrypoint role.
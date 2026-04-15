# Test Reorganization — Refactor Spec

> **Status:** Complete
> **Date:** 2026-04-07
> **Scope:** Rename sprint-numbered and tech-debt-prefixed test files to
> feature-descriptive names, and consolidate related tests into the existing
> subdirectory structure.
> **Affects:** `tests/` directory (130+ files)
> **Motivation:** The tests directory contains 19 sprint-numbered files
> (e.g., `sprint-1-bread-framework.test.ts`) and 8 tech-debt-prefixed files
> (e.g., `td-a-booch-audit.test.ts`). These names describe *when* or *why*
> tests were written, not *what* they test. Feature-named files are easier
> to locate and maintain. Several subdirectories already exist (`browser-ui/`,
> `chat/`, `corpus/`, `evals/`, `search/`, `mcp/`, `helpers/`) that could
> absorb related tests.
> **Requirement IDs:** `TRO-001` through `TRO-099`

---

## 1. Problem Statement

### 1.1 Current state

The `tests/` directory contains 130+ files. Most follow a sensible
`feature-name.test.ts` convention. However, 19 sprint-numbered files and 8
tech-debt-prefixed files break the pattern and require reading the file
contents to understand what they test.

### 1.2 Verified issues

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **Sprint-numbered test files** | 19 files named `sprint-{N}-*.test.ts` | Names describe timeline, not feature `[TRO-001]` |
| 2 | **Tech-debt prefixed files** | 8 files named `td-{letter}-*.test.ts` | Names describe audit origin, not test subject `[TRO-002]` |
| 3 | **Mixed granularity** | Some tests belong in existing subdirectories (`browser-ui/`, `chat/`) but sit at root | Inconsistent organization `[TRO-003]` |

### 1.3 Root cause

Tests were named after the sprint or tech-debt ticket that created them,
which made sense during development but degrades discoverability over time.

### 1.4 Why it matters

When a feature breaks, developers search for tests by feature name. Sprint
numbers and tech-debt codes are not discoverable without institutional
knowledge.

---

## 2. Design Goals

1. Rename all sprint-numbered test files to feature-descriptive names using
   the existing `kebab-case.test.ts` convention. `[TRO-010]`
2. Rename all tech-debt-prefixed test files to describe what they
   test. `[TRO-011]`
3. Move tests into existing subdirectories where a clear match exists (e.g.,
   browser/UI tests into `browser-ui/`). `[TRO-012]`
4. Use `git mv` to preserve history. `[TRO-013]`
5. Update any cross-references (imports, vitest config includes) that depend
   on filenames. `[TRO-014]`
6. Complete in a single sprint. `[TRO-015]`

---

## 3. Architecture

### 3.1 Proposed renames (sprint files)

| Current Name | Proposed Name | Rationale |
| --- | --- | --- |
| `sprint-1-bread-framework.test.ts` | `bread-framework.test.ts` | Tests the BREAD framework |
| `sprint-1-ui-components.test.tsx` | `ui-component-contracts.test.tsx` | Tests component contracts |
| `sprint-2-users-and-roles.test.ts` | `users-and-roles.test.ts` | Tests user/role management |
| `sprint-3-blog-orchestration-qa.test.ts` | `blog-orchestration-qa.test.ts` | Tests blog pipeline QA |
| `sprint-3-first-message.test.tsx` | `first-message-flow.test.tsx` | Tests first-message UI |
| `sprint-4-referral-governance-qa.test.ts` | `referral-governance-qa.test.ts` | Tests referral governance |
| `sprint-4-referral-tracking.test.ts` | `referral-tracking.test.ts` | Tests referral tracking |
| `sprint-4-theme-governance-qa.test.ts` | `theme-governance-qa.test.ts` | Tests theme governance |
| `sprint-5-jobs-system-dashboard.test.ts` | `jobs-system-dashboard.test.ts` | Tests jobs dashboard |
| `sprint-5-public-content-routes.test.ts` | `public-content-routes.test.ts` | Tests public content |
| `sprint-6-notifications-polish.test.tsx` | `notifications-polish.test.tsx` | Tests notification UX |
| `sprint-6-seo-infrastructure.test.ts` | `seo-infrastructure.test.ts` | Tests SEO setup |
| `sprint-7-blog-pipeline.test.ts` | `blog-pipeline-integration.test.ts` | Tests blog pipeline |
| `sprint-8-ux-config-and-new-components.test.tsx` | `ux-config-components.test.tsx` | Tests UX config |
| `sprint-9-ux-shared-component-upgrades.test.tsx` | `ux-shared-components.test.tsx` | Tests shared components |
| `sprint-10-ux-layout-and-navigation.test.tsx` | `ux-layout-navigation.test.tsx` | Tests layout/nav |
| `sprint-11-ux-pagination-data-layer.test.ts` | `ux-pagination-data-layer.test.ts` | Tests pagination |
| `sprint-12-ux-conversations-p0-and-journal.test.tsx` | `ux-conversations-journal.test.tsx` | Tests conversation UI |
| `sprint-13-ux-auth-forms-accessibility.test.tsx` | `ux-auth-forms-accessibility.test.tsx` | Tests a11y |

### 3.2 Proposed renames (tech-debt files)

| Current Name | Proposed Name | Rationale |
| --- | --- | --- |
| `td-a-booch-audit.test.ts` | `architecture-cohesion-audit.test.ts` | Tests class cohesion |
| `td-a-booch-job-visibility.test.ts` | `job-visibility-cohesion.test.ts` | Tests job visibility |
| `td-b-knuth-performance-audit.test.ts` | `performance-audit.test.ts` | Tests perf guards |
| `td-c-job-visibility-solid-audit.test.ts` | `job-visibility-solid.test.ts` | Tests SOLID compliance |
| `td-c-martin-solid-audit.test.ts` | `solid-architecture-audit.test.ts` | Tests SOLID compliance |
| `td-c3-dashboard-split.test.ts` | `dashboard-split.test.ts` | Tests dashboard split |
| `td-c3-hardening-audit.test.ts` | `hardening-audit.test.ts` | Tests hardening |
| `td-d-job-visibility-gof-audit.test.ts` | `job-visibility-patterns.test.ts` | Tests GoF patterns |

### 3.3 Subdirectory consolidation candidates

Review during implementation — tests with `browser-` prefix may belong in
`browser-ui/`, chat-related tests may belong in `chat/`. Do not force moves
that are ambiguous.

---

## 4. Security

No security implications — this is a pure rename/move refactor.

---

## 5. Testing Strategy

- `npx vitest run` must pass after all renames with zero test changes beyond
  file paths.
- No new tests required.

---

## 6. Sprint Plan

| Sprint | Focus |
| --- | --- |
| Sprint 0 | Rename all 27 files, move candidates into subdirectories, verify tests pass |

---

## 7. Future Considerations

- A naming convention lint rule (e.g., no `sprint-` or `td-` prefixes)
  could prevent regression.
- The `evals/` subdirectory could absorb QA and audit test files if a
  clear policy is established.

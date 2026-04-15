# Sprint 4 — Governance And Maintenance Follow-Through

> **Goal:** Convert the finished color-system refactor into a durable maintenance contract by formalizing the post-closeout audit routine, tightening the targeted drift guards, documenting when browser QA is mandatory, and preserving explicit observability for the theme-transition runtime.
>
> **Spec Reference:** `spec.md` — Part 5 Priority 4 and 5 / Part 6 Phase 4
>
> **Source Files:** `tests/sprint-4-theme-governance-qa.test.ts`, `src/components/ThemeProvider.test.tsx`, `src/components/ThemeSwitcher.test.tsx`, `src/hooks/useUICommands.test.tsx`, `src/app/styles/foundation.css`, `src/app/styles/shell.css`, `src/app/styles/chat.css`, `src/app/styles/editorial.css`, maintenance docs under `docs/_refactor/color_optimization/`
>
> **Status:** follow-on sprint created after Sprint 3 closeout; not part of the original scheduled chain
>
> **Estimated Effort:** ~3h

---

## Sprint Status Input

Sprint 4 assumes the original implementation work is complete.

Verified shipped foundations from earlier sprints:

1. Sprint 0 established the accessibility baseline and initial cross-theme corrections.
2. Sprint 1 landed theme-identity corrections, including Swiss selective interactive accent and the revised accent architecture.
3. Sprint 2 completed dark-mode recalibration and shared shell/chat surface adoption.
4. Sprint 3 closed the remaining opacity-over-blur defects, added `@property` registration for the core token transition path, preserved the ThemeProvider overlay fallback, and added the first structural governance guard in `tests/sprint-4-theme-governance-qa.test.ts`.

Verified post-closeout reality in the repo:

1. The code-level implementation is complete enough to close the original workstream.
2. The remaining risk is no longer missing design work; it is regression risk from future edits in TSX and shared CSS.
3. The current governance test covers the most recent regressions, but the maintenance boundary is still implicit rather than documented.
4. Browser-visible validation was performed during Sprint 3 closeout, but the repeatable routine for future edits has not yet been formalized in the docs.

## Why Sprint 4 Exists

The planned chain ended at Sprint 3. Sprint 4 exists because the codebase now has enough color-system surface area that post-closeout governance needs to be explicit instead of living only in chat history and a single test file.

Sprint 4 is not a new design sprint.

It exists to finish the workstream operationally by answering these maintenance questions clearly:

1. which kinds of color edits are safe token changes versus changes that require browser QA
2. which historically unstable literals and patterns should stay under structural test coverage
3. which focused regression bundle should be run after future color-system edits
4. how future editors know whether they are changing shared semantic surfaces or accidentally reintroducing component-local drift

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `tests/sprint-4-theme-governance-qa.test.ts` | current structural governance guard for centralized theme authority, semantic surface ownership, and known unsafe opacity literals |
| `src/components/ThemeProvider.test.tsx` | current runtime guard for theme document attributes, invalid stored-theme rejection, overlay fallback behavior, and dark-mode state |
| `src/components/ThemeSwitcher.test.tsx` | selector-integrity coverage for theme-switch behavior and user-facing theme state |
| `src/hooks/useUICommands.test.tsx` | command-application guard for manifest-backed runtime theme controls |
| `src/app/styles/foundation.css` | global token and transition authority including the `@property` registrations and shared muted token floors |
| `src/app/styles/shell.css` | shell and navigation authority where blurred rail and quiet-nav regressions previously appeared |
| `src/app/styles/chat.css` | shared chat surface authority where helper-copy and translucent support-text regressions previously appeared |
| `src/app/styles/editorial.css` | shared editorial authority for journal/profile/library readable-content surfaces |
| `src/frameworks/ui/ChatInput.tsx` | historically unstable component-local source of helper-copy, placeholder, and hover opacity drift |
| `src/frameworks/ui/MessageList.tsx` | historically unstable component-local source of transcript support-text drift |
| `src/components/journal/JournalLayout.tsx` | historically unstable component-local source of figure-caption and metadata opacity drift |
| `src/components/journal/PublicJournalPages.tsx` | historically unstable component-local source of archive and empty-state opacity drift |
| `docs/theme-brand-audit.md` | runtime-facing color/theme reference that should remain aligned with the shipped maintenance contract |
| `docs/_refactor/color_optimization/spec.md` | canonical color-system optimization source defining the Priority 4 and 5 maintenance concerns Sprint 4 now operationalizes |

---

## QA Findings Before Implementation

1. Sprint 3 fixed the implementation defects, but the repeatable maintenance procedure still lives only in a test command and ad hoc browser steps.
2. The current governance test is valuable, but it only protects the exact chat and journal regressions already discovered. It does not yet document why those patterns are guarded or when new guards should be added.
3. Future editors can still make token-only edits, semantic-surface edits, or TSX-local literal edits without a written rule telling them which category they are in and what validation burden follows.
4. ThemeProvider transition behavior is currently covered by focused tests, but the maintenance standard for preserving that behavior is not written down as part of the workstream.

---

## Tasks

### 1. Formalize the post-closeout audit routine

**What:** Add the minimal maintenance checklist that must be run after any future color-system edit.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Create or Modify** | a lightweight workstream index or maintenance note if needed |
| **Spec** | Part 6 Phase 4 |

### Required outputs

1. define the focused automated regression bundle for token, shell, chat, and editorial color edits
2. define the live browser checks that must be repeated when blurred or translucent text changes
3. define the stop condition for using automated validation only versus escalating to browser QA

### Task 1 Outcome

1. future color edits have one explicit maintenance path instead of a remembered sequence of commands
2. the repo no longer depends on chat history to know how Sprint 3 was validated

---

### 2. Tighten the governance guard without making it noisy

**What:** Expand the structural drift guard only where the repo has real evidence of historical regression.

| Item | Detail |
| --- | --- |
| **Modify** | `tests/sprint-4-theme-governance-qa.test.ts` |
| **Modify as needed** | focused component/runtime tests only if a new guard needs companion assertions |
| **Spec** | Part 5 Priority 4 |

### Required guard scope

Keep the test intentionally narrow and history-driven.

Candidate additions are limited to:

1. shell quiet-nav and account-menu muted text floors on blurred surfaces
2. editorial figure-caption and archive metadata floors where component-local literals previously overrode shared CSS
3. chat helper, attachment, and hero-support copy floors where component-local literals previously drifted below the intended floor

### Required constraints

1. do not turn the governance test into a blanket ban on all low-opacity classes
2. only guard exact unsafe literals or tightly scoped patterns with demonstrated regression history
3. keep the test understandable enough that a future editor can tell why a failure occurred

### Task 2 Outcome

1. the governance guard protects the historically unstable paths without becoming a false-positive machine
2. new color work remains easy to ship when it stays inside the documented safe boundaries

---

### 3. Document the maintenance boundary by edit type

**What:** Record which categories of color edits require which level of verification.

| Item | Detail |
| --- | --- |
| **Modify** | this sprint doc |
| **Modify as needed** | `docs/theme-brand-audit.md` or a short maintenance note under `docs/_refactor/color_optimization/` |
| **Spec** | Part 5 Priority 4 and 5 |

### Required distinctions

1. token-only edits in `src/app/styles/foundation.css`
2. semantic surface edits in `src/app/styles/shell.css`, `src/app/styles/chat.css`, and `src/app/styles/editorial.css`
3. component-local TSX class edits in files such as `ChatInput.tsx`, `MessageList.tsx`, `JournalLayout.tsx`, and `PublicJournalPages.tsx`

### Required rule set

1. token-only edits may use the focused automated bundle unless they materially alter transition behavior or status/accent contrast
2. semantic surface edits require the focused automated bundle and targeted browser QA when they affect blurred, translucent, or overlay-backed text
3. component-local TSX color-class edits must be treated as highest-risk because they can override shared floors and therefore require focused automated validation plus browser confirmation on the affected surface

### Task 3 Outcome

1. future editors can classify their own change correctly before shipping it
2. the workstream has a durable operational rule set instead of a one-time closeout narrative

---

### 4. Preserve transition behavior as an explicit runtime contract

**What:** Make the test and doc story around ThemeProvider transitions durable enough that future cleanup work does not remove them accidentally.

| Item | Detail |
| --- | --- |
| **Modify as needed** | `src/components/ThemeProvider.test.tsx` |
| **Modify as needed** | `src/components/ThemeSwitcher.test.tsx` |
| **Modify** | this sprint doc |
| **Spec** | Part 5 Priority 5 |

### Required assertions

1. theme switching still applies the expected runtime document attributes and classes
2. the neutral overlay fallback still renders on theme switch
3. the maintenance docs explicitly call out that the overlay fallback and token-transition path are both part of the supported transition protocol

### Task 4 Outcome

1. future refactors cannot silently remove the transition overlay or theme-state markers without failing focused coverage
2. the transition protocol remains part of the maintained system contract rather than an implementation accident

---

## Implemented Sprint 4 Outputs

Sprint 4 is considered implemented through lightweight governance and maintenance work rather than additional design-system code changes.

Implemented outputs:

1. the workstream now has an explicit sprint index and maintenance-oriented follow-through sprint in `docs/_refactor/color_optimization/sprints/README.md`
2. the maintenance boundary is documented here by edit type: token-only, semantic-surface, and component-local TSX overrides
3. the structural governance test now covers the historically unstable shell muted-text floor alongside the existing chat and journal drift guards
4. the verification bundle now includes the command-side runtime guard in `src/hooks/useUICommands.test.tsx` so Sprint 4’s stated source files match its actual QA surface
5. the workstream now has a single non-sprint maintenance reference in `docs/_refactor/color_optimization/maintenance.md`

---

## Maintenance Verification Bundle

Run this bundle after future color-system changes unless the edit clearly falls below the documented threshold.

```bash
npm run lint:css
npm exec vitest run src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/hooks/useUICommands.test.tsx tests/blog-hero-rendering.test.tsx tests/sprint-4-theme-governance-qa.test.ts
```

### Required browser checks when applicable

Run targeted live verification when a change touches blurred, translucent, or overlay-backed text or the ThemeProvider transition path.

Minimum checks:

1. homepage helper copy on the floating or embedded chat surface
2. published journal/article figure captions and archive metadata
3. theme switching on the active public shell

---

## Completion Checklist

- [x] post-closeout audit routine documented in a repeatable form
- [x] governance guard covers the historically unstable drift paths without broad false positives
- [x] maintenance boundary is documented for token, semantic-surface, and component-local edits
- [x] transition runtime contract remains explicit in both tests and docs
- [x] Sprint 4 verification bundle is green after any guard updates

## QA Result

Status: complete

Final Sprint 4 verification bundle:

```bash
npm run lint:css
npm exec vitest run src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/hooks/useUICommands.test.tsx tests/blog-hero-rendering.test.tsx tests/sprint-4-theme-governance-qa.test.ts
```

Observed result:

1. `npm run lint:css` passed.
2. The focused Sprint 4 regression suite passed: 5 files, 32 tests.
3. The governance guard now covers shell muted-text floors in addition to the previously closed chat and journal regressions.

## Exit Criteria

Sprint 4 is complete when the color workstream no longer depends on memory to stay healthy.

That means:

1. the repo has one explicit maintenance routine for future color edits
2. the governance guard protects the real historical failure modes and nothing broader
3. future editors can tell when a color change requires live browser QA versus focused automated validation only
4. the transition protocol remains observable and intentionally preserved

If those rules are still implicit, the implementation may be done, but the workstream is not operationally complete.
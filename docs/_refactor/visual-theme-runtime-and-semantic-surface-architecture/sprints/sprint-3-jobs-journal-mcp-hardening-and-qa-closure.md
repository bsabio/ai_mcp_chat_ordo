# Sprint 3 - Jobs, Journal, MCP Hardening, And QA Closure

> **Goal:** Extend semantic surface extraction to the remaining high-value jobs and journal/profile surfaces, then close the first workstream delivery wave by hardening manifest-backed theme controls, selector integrity, persistence continuity, and the final browser/build verification gate.
> **Spec ref:** §5.0, §5.3, §5.5, §5.6, §6.3, §6.3.1, §6.4, §6.5, §7, §8, §9
> **Prerequisite:** Sprint 2 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/components/jobs/JobsPagePanel.tsx` | jobs desk hotspot with repeated panel, card, selected-state, and progress styling still called out by the parent spec |
| `src/components/jobs/JobsPagePanel.test.tsx` | focused jobs regression surface for card state and panel behavior |
| `src/components/journal/PublicJournalPages.tsx` | public journal/editorial hotspot called out for high-polish semantic extraction |
| `src/components/journal/JournalLayout.tsx` | journal route framing surface that may need to consume extracted journal primitives explicitly |
| `tests/journal-public-route-convergence.test.ts` | existing journal regression guard that must remain green and should be extended or paired with a new UI-facing journal surface test if Sprint 3 changes route-adjacent journal presentation materially |
| `tests/journal-taxonomy-metadata.test.ts` | existing journal metadata guard that keeps non-visual journal invariants covered while UI extraction work proceeds |
| `src/components/profile/ProfileSettingsPanel.tsx` | profile chrome hotspot paired with journal surfaces in the parent spec |
| `src/components/profile/ProfileSettingsPanel.test.tsx` | focused profile regression surface for settings-panel behavior |
| `src/app/styles/jobs.css` | natural CSS authority home for reusable jobs semantic surfaces |
| `src/app/styles/editorial.css` | natural CSS authority home for journal and profile semantic surfaces |
| `src/hooks/useUICommands.ts` | client-side command application boundary for manifest-backed theme control |
| `src/hooks/useUICommands.test.tsx` | command, persistence, hydration, and invalid-input regression surface |
| `src/components/ThemeProvider.test.tsx` | runtime theme-state and remount continuity regression surface |
| `src/components/ThemeSwitcher.tsx` | user-facing selector that must stay aligned with manifest-backed theme membership |
| `src/components/ThemeSwitcher.test.tsx` | selector-integrity regression surface for manifest-backed theme options |
| `src/core/use-cases/tools/tool-schema-compatibility.test.ts` | schema-level proof that `set_theme` and `adjust_ui` remain aligned with the manifest-backed theme enum |
| `src/core/use-cases/ThemeManagementInteractor.test.ts` | metadata authority regression surface for the remaining interactor contract |
| `src/adapters/ChatPresenter.test.ts` | tool-call to UI-command mapping regression surface for theme-control commands |
| `tests/browser-overlays.test.tsx` | browser-level guard for overlay and shell layering across routes |
| `tests/browser-motion.test.tsx` | browser-level guard for motion-sensitive hardening after semantic extraction |
| `tests/browser-fab-chat-flow.test.tsx` | browser-level guard ensuring prior chat extraction remains stable during Sprint 3 closure |
| `tests/browser-fab-mobile-density.test.tsx` | browser-level guard for density behavior after final control-plane hardening |
| `tests/browser-fab-scroll-recovery.test.tsx` | browser-level guard for transcript continuity after final shell and route work |
| `tests/browser-ui/jobs-page.spec.ts` | existing browser-level jobs surface regression for signed-in jobs feed rendering |
| `tests/browser-ui/deferred-blog-jobs.spec.ts` | existing browser-level jobs workflow regression for deferred blog/article production states |

---

## QA Findings Before Implementation

1. Sprint 2 removed the highest-churn chat and shell duplication, but the parent spec still calls out jobs desk panels plus journal/profile polish surfaces as remaining semantic-extraction hotspots.
2. Sprint 2 also exposed that this repo's Tailwind and Turbopack path has real build constraints around semantic CSS authoring, so Sprint 3 must keep new surface primitives build-safe rather than assuming every Tailwind abstraction form is valid.
3. The command plane is manifest-backed, but Sprint 3 still needs explicit closure around selector integrity, persistence continuity, and tool-schema alignment so the theme system is governed as a runtime API rather than only as a styling convention.
4. Browser coverage must stay in the loop because Sprint 3 touches route-sensitive polished surfaces and closes the refactor with final motion, overlay, density, and build verification.

---

## Task 3.1 - Extract semantic jobs and journal/profile surfaces

**What:** Move the remaining repeated jobs, journal, and profile visual formulas out of TSX and into shared semantic surface primitives owned by the appropriate stylesheet authority.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/jobs/JobsPagePanel.tsx` |
| **Modify** | `src/components/journal/PublicJournalPages.tsx` |
| **Modify as needed** | `src/components/journal/JournalLayout.tsx` |
| **Modify** | `src/components/profile/ProfileSettingsPanel.tsx` |
| **Modify** | `src/app/styles/jobs.css` |
| **Modify** | `src/app/styles/editorial.css` |
| **Modify as needed** | `src/components/jobs/JobsPagePanel.test.tsx` |
| **Modify or create as needed** | journal-focused UI regression coverage, extending `tests/journal-public-route-convergence.test.ts` where sufficient or adding a dedicated journal surface test if Sprint 3 changes visual structure materially |
| **Modify as needed** | `src/components/profile/ProfileSettingsPanel.test.tsx` |
| **Spec** | §5.3, §5.6, §6.3, §6.3.1 |

### Required outcomes for Task 3.1

1. Jobs desk panels, cards, selected-state surfaces, and progress treatments have one named semantic owner instead of component-local visual duplication.
2. Journal and profile polished surfaces consume shared semantic primitives rather than carrying long inline chrome formulas.
3. Route-aware tone remains explicit for journal surfaces and does not regress the quieter shell treatment established in prior sprints.
4. New semantic classes follow the build-safe patterns already proven in this repo's CSS authority files.
5. Remaining jobs and journal/profile TSX hotspots replace reusable visual string branching with small explicit variant ownership where stateful styling still exists after extraction.

### Implementation notes for Task 3.1

1. Keep layout and content-specific structure in TSX, but move reusable visual formulas into `jobs.css` and `editorial.css`.
2. Prefer a small, explicit surface vocabulary over introducing a generalized styling framework in TypeScript.
3. If profile and journal surfaces share the same high-polish treatment, give that treatment one semantic owner rather than near-duplicate class sets in both files.
4. If jobs cards, journal callouts, or profile controls still need stateful emphasis after extraction, express that through small local variant maps rather than falling back to long TSX-local visual template literals.

### Verify Task 3.1

```bash
npm exec vitest run src/components/jobs/JobsPagePanel.test.tsx src/components/profile/ProfileSettingsPanel.test.tsx tests/journal-public-route-convergence.test.ts tests/journal-taxonomy-metadata.test.ts
```

If Sprint 3 materially changes journal presentation structure or journal-specific surface state, add a dedicated journal UI-facing regression and include it in the same Task 3.1 verification bundle.

---

## Task 3.2 - Close the manifest-backed theme control plane

**What:** Finish the MCP-facing and selector-facing theme-control contract so manifest-backed authority, tool schemas, selector membership, persistence, and metadata all stay aligned.

| Item | Detail |
| --- | --- |
| **Modify as needed** | `src/hooks/useUICommands.ts` |
| **Modify as needed** | `src/hooks/useUICommands.test.tsx` |
| **Modify as needed** | `src/components/ThemeSwitcher.tsx` |
| **Modify as needed** | `src/components/ThemeSwitcher.test.tsx` |
| **Modify as needed** | `src/components/ThemeProvider.test.tsx` |
| **Modify as needed** | `src/core/use-cases/tools/tool-schema-compatibility.test.ts` |
| **Modify as needed** | `src/core/use-cases/ThemeManagementInteractor.test.ts` |
| **Modify as needed** | `src/adapters/ChatPresenter.test.ts` |
| **Spec** | §5.0, §5.1, §5.5, §6.5, §7 |

### Required outcomes for Task 3.2

1. `set_theme` and `adjust_ui` remain explicitly bounded and manifest-backed, with tests proving only supported theme controls execute.
2. Selector-level coverage proves the user-facing theme picker reflects the same manifest-backed theme set as runtime state and tool schemas.
3. Persistence and hydration coverage prove theme state survives authenticated preference restore, localStorage restore, and remounts.
4. Theme metadata authority is either still intentionally derived from the manifest path or clearly tested as a non-drifting compatibility layer.

### Implementation notes for Task 3.2

1. Sprint 3 should close authority gaps, not reopen the command boundary debate from Sprint 1.
2. Prefer extending existing focused tests over inventing a new umbrella harness unless a new seam truly lacks coverage.
3. If additional documentation is needed for safe supported controls, keep it aligned with the manifest-backed runtime contract rather than describing hypothetical future controls.

### Verify Task 3.2

```bash
npm exec vitest run src/hooks/useUICommands.test.tsx src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/core/use-cases/tools/tool-schema-compatibility.test.ts src/core/use-cases/ThemeManagementInteractor.test.ts src/adapters/ChatPresenter.test.ts
```

---

## Task 3.3 - Final browser and build closure for the shipped extraction wave

**What:** Revalidate the extracted surface layer and manifest-backed control plane with the final browser-facing suites and production build gate.

| Item | Detail |
| --- | --- |
| **Run** | focused jobs, profile, command, selector, and browser suites touched in Tasks 3.1 and 3.2 |
| **Run** | final browser QA bundle |
| **Run** | production build gate |
| **Update** | sprint doc with QA result and completion checklist when green |
| **Spec** | §5.6, §6.5, §7, §8 |

### Required outcomes for Task 3.3

1. Focused UI regressions for chat, shell, jobs, and journal/profile remain green.
2. Browser-facing motion, overlay, density, scroll-recovery, and floating-chat behavior remain green after Sprint 3 changes.
3. Existing jobs browser workflows remain green, or an explicitly documented equivalent focused browser slice replaces them.
4. `npm run build` passes with the final semantic surface layer in place.
5. The sprint finishes with an explicit QA result that records the exact verification bundle used for closure.

### Verify Task 3.3

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/components/jobs/JobsPagePanel.test.tsx src/components/journal/JournalLayout.test.tsx src/components/profile/ProfileSettingsPanel.test.tsx src/hooks/useUICommands.test.tsx src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/core/use-cases/tools/tool-schema-compatibility.test.ts src/core/use-cases/ThemeManagementInteractor.test.ts src/adapters/ChatPresenter.test.ts src/components/AppShell.test.tsx src/components/SiteNav.test.tsx tests/journal-public-route-convergence.test.ts tests/journal-taxonomy-metadata.test.ts tests/browser-overlays.test.tsx tests/browser-motion.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx
npm exec playwright test tests/browser-ui/jobs-page.spec.ts tests/browser-ui/deferred-blog-jobs.spec.ts
npm run build
```

---

## Completion Checklist

- [x] jobs panels and cards consume semantic surface primitives instead of repeated TSX-local visual formulas
- [x] journal and profile polished surfaces consume shared semantic primitives with route tone preserved
- [x] remaining jobs and journal/profile stateful styling uses small explicit variant ownership where reusable visual branching still exists
- [x] manifest-backed theme control boundaries remain explicit and green through runtime, selector, schema, and presenter tests
- [x] persistence, hydration, and remount continuity for theme state remain green
- [x] focused jobs, profile, command, selector, and browser suites are green
- [x] `npm run build` passes

## QA Result

Status: complete

Final verification bundle rerun on the post-cleanup Sprint 3 tree:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/components/jobs/JobsPagePanel.test.tsx src/components/journal/JournalLayout.test.tsx src/components/profile/ProfileSettingsPanel.test.tsx src/hooks/useUICommands.test.tsx src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/core/use-cases/tools/tool-schema-compatibility.test.ts src/core/use-cases/ThemeManagementInteractor.test.ts src/adapters/ChatPresenter.test.ts src/components/AppShell.test.tsx src/components/SiteNav.test.tsx tests/journal-public-route-convergence.test.ts tests/journal-taxonomy-metadata.test.ts tests/browser-overlays.test.tsx tests/browser-motion.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx tests/browser-fab-scroll-recovery.test.tsx
npm exec playwright test tests/browser-ui/jobs-page.spec.ts tests/browser-ui/deferred-blog-jobs.spec.ts
npm run build
```

Observed result:

1. `npm run typecheck` passed.
2. `npm run lint:css` passed.
3. The Sprint 3 Vitest closure bundle passed: 18 files, 92 tests, including the dedicated journal UI regression in `src/components/journal/JournalLayout.test.tsx`.
4. The Sprint 3 Playwright jobs workflow bundle passed: 4 tests in 1.1 minutes.
5. `npm run build` passed.

Implementation closure notes:

1. Jobs desk chrome now resolves through semantic jobs surfaces in `jobs.css`, with explicit local state ownership for card and status variants.
2. Journal and profile presentation hotspots now resolve through editorial semantic surfaces in `editorial.css`, with dedicated journal UI regression coverage added for Sprint 3.
3. Manifest-backed theme control hardening is closed through runtime, selector, schema, presenter, persistence, and hydration tests.
4. Browser-facing compatibility was preserved for deferred-job labels while the draft-preview contract was fully converged on `/admin/journal/preview/[slug]`.

## Exit Criteria

Sprint 3 is complete only when the repo has one clear answer to all of the following remaining workstream questions:

1. which jobs, journal, and profile visual patterns are owned by semantic CSS primitives rather than component-local class formulas
2. how the user-facing theme selector, runtime command application, and tool schemas stay aligned with the same manifest-backed theme set
3. how persistence and hydration continuity for theme state remain covered after the refactor closes
4. whether the final extracted surface layer is still browser-safe and build-safe in this repo's Tailwind and Turbopack path

If jobs or journal/profile surfaces still rely on large component-local strings for shared visual patterns, or if selector and command authority can drift again, Sprint 3 is not complete.

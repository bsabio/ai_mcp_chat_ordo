# Sprint 4 - Regression Coverage And QA

> **Goal:** Finish the shell remediation with explicit regression coverage,
> verification evidence, and a final acceptance review against the shell spec.
> **Spec ref:** `SND-037`, `SND-110` through `SND-116`
> **Prerequisite:** Sprint 3 committed
> **Test count target:** 588 existing + 4 new = 592 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `tests/shell-navigation-model.test.ts` | Sprint 0 adds route-truth regression coverage for canonical shell data |
| `tests/shell-brand.test.tsx` | Sprint 0 adds focused shared-brand semantic coverage for canonical label, href, and hidden-wordmark behavior |
| `tests/site-shell-composition.test.tsx` | Sprint 1 adds focused header/footer composition assertions |
| `tests/shell-command-parity.test.ts` | Sprint 2 adds command-surface parity coverage |
| `tests/shell-visual-system.test.tsx` | Sprint 3 adds shell visual-system regression coverage, including shared shell-role utilities, truthful footer copy, and real `AccountMenu`/`ChatHeader` rendering |
| `tests/homepage-shell-layout.test.tsx` | Existing shell-stage tests must remain green after shell IA refactors |
| `tests/browser-overlays.test.tsx` | Existing overlay tests now include consumer-level command-palette assertions for canonical shell navigation and theme commands |
| `tests/browser-motion.test.tsx` | Existing motion/browser shell tests must remain green after nav/footer token refactors |
| `docs/_specs/shell-navigation-and-design-system/spec.md` | The feature is only complete when `SND-110` through `SND-116` are all evidenced by tests or explicit QA findings |

## Inputs From Prior Sprints

Sprint 0 established the canonical shell route model and shared brand primitive,
backed by `tests/shell-navigation-model.test.ts` and `tests/shell-brand.test.tsx`.

Sprint 1 moved header and footer composition onto canonical shell data and
removed fake footer route groups and misleading footer status copy.

Sprint 2 unified palette and slash-command surfaces onto shared shell command
definitions, and `tests/browser-overlays.test.tsx` now covers the real command
palette consumer path instead of only open/close behavior.

Sprint 3 added shell-scoped visual primitives and a focused regression layer in
`tests/shell-visual-system.test.tsx`, so Sprint 4 should treat shell-role
utility adoption and truthful footer treatment as already-delivered baseline
behavior to preserve and evidence rather than reopen.

---

## Task 4.1 - Add an end-to-end shell acceptance test layer

**What:** Add one focused test file that exercises the canonical shell contract
from rendered UI rather than only from data helpers.

| Item | Detail |
| --- | --- |
| **Create** | `tests/shell-acceptance.test.tsx` |
| **Spec** | `SND-031` through `SND-037`, `SND-110` through `SND-116` |

### Task 4.1 Notes

Assert at minimum:

1. the header exposes only canonical primary-nav items
2. the footer exposes only canonical grouped links
3. command palette navigation matches the same canonical route labels
4. the shared brand primitive appears consistently in shell surfaces
5. no misleading dead or deprecated shell destinations appear in the rendered
   shell acceptance surface
6. truthful footer treatment remains intact, with no decorative operational
   status language reintroduced

This test should simulate the product-level shell, not only unit-test helpers.

Prefer rendering the real shell composition with mocked auth/theme/router
boundaries rather than testing helper modules alone. The acceptance test should
be the place where header, footer, and command palette are checked together.

### Task 4.1 Verify

```bash
npm run test -- tests/shell-acceptance.test.tsx
```

---

## Task 4.2 - Run and record targeted shell verification

**What:** Execute the focused shell/browser test set and record the concrete
verification outcome in this sprint document.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/shell-navigation-and-design-system/sprints/sprint-4-regression-coverage-and-qa.md` |
| **Spec** | `SND-037`, `SND-110` through `SND-116` |

### Task 4.2 Notes

Record at minimum:

1. targeted shell tests run
2. full `npm run quality` result
3. any deviations or residual risks that remain after implementation

The targeted shell test set should be explicit, not implied. Record results for
at least:

1. `tests/shell-navigation-model.test.ts`
2. `tests/shell-brand.test.tsx`
3. `tests/site-shell-composition.test.tsx`
4. `tests/shell-command-parity.test.ts`
5. `tests/shell-visual-system.test.tsx`
6. `tests/shell-acceptance.test.tsx`
7. `tests/homepage-shell-layout.test.tsx`
8. `tests/browser-overlays.test.tsx`
9. `tests/browser-motion.test.tsx`

Record concrete pass/fail outcomes and any follow-up fixes applied before the
feature is considered complete.

### Task 4.2 Verify

```bash
npm run quality
```

### Task 4.2 Results

- `npm run test -- tests/shell-acceptance.test.tsx`: passing (`1` file, `4`
   tests)
- `npm run test -- tests/shell-navigation-model.test.ts tests/shell-brand.test.tsx tests/site-shell-composition.test.tsx tests/shell-command-parity.test.ts tests/shell-visual-system.test.tsx tests/shell-acceptance.test.tsx tests/homepage-shell-layout.test.tsx tests/browser-overlays.test.tsx tests/browser-motion.test.tsx`:
   passing (`9` files, `42` tests)
- `npm run quality`: passing (`tsc --noEmit`, `eslint --max-warnings 0`,
   `vitest run`) with `103` passing files and `592` passing tests

No Sprint 4 deviations remain after implementation. The targeted verification
set and full quality suite both passed without follow-up code changes beyond the
acceptance-test assertion scoping fix applied during Task 4.1 validation.

---

## Task 4.3 - QA the shell package against the spec

**What:** Perform a clean review of implementation versus spec requirements and
note any follow-up defects fixed during QA.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/shell-navigation-and-design-system/spec.md` |
| **Modify** | `docs/_specs/shell-navigation-and-design-system/sprints/README.md` |
| **Spec** | `SND-030` through `SND-116` |

### Task 4.3 Notes

This is a QA pass, not a new feature pass. Only document real delivered state
and any necessary deviations.

The QA write-up should include a compact requirement-to-evidence mapping for
`SND-110` through `SND-116`, identifying which test file or QA check proves
each requirement.

That mapping should account for the actual distributed evidence produced across
the earlier sprints, especially `tests/shell-brand.test.tsx` for `SND-115`,
`tests/browser-overlays.test.tsx` plus `tests/shell-command-parity.test.ts` for
`SND-113` and `SND-114`, and `tests/shell-visual-system.test.tsx` for
`SND-116` and `SND-102`-adjacent shell truthfulness checks.

### Task 4.3 Verify

```bash
npm run quality
```

---

## Task 4.4 - Update the specs index to reflect implementation state

**What:** Update `docs/_specs/README.md` when the feature moves from planning to
active implementation or completion.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/README.md` |
| **Spec** | `SND-037` |

### Task 4.4 Notes

Do not mark the package complete until the sprint checklist, tests, and QA
evidence all support that state.

If the feature is still partially implemented after Sprint 4 QA, the README
entry should move to `In Progress`, not `Complete`.

### Task 4.4 Verify

```bash
npm run quality
```

---

## Completion Checklist

- [x] Product-level shell acceptance coverage exists and passes
- [x] Focused shell/browser verification results are recorded in the sprint doc
- [x] QA review reconciles implementation with the shell spec and includes requirement-to-evidence mapping for `SND-110` through `SND-116`
- [x] The specs index accurately reflects the feature state

## QA Deviations

None.

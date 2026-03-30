# Sprint 0 — Authority Freeze And Documentation Correction

> **Goal:** Freeze the current theme authority map, correct stale theme documentation, and add the first drift guards before manifest extraction begins.
> **Spec ref:** §1, §2.2, §5.0, §5.1, §6.1, §7, §8
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/core/entities/theme.ts` | canonical runtime theme union currently defines exactly four supported themes: `fluid`, `bauhaus`, `swiss`, `skeuomorphic` |
| `src/components/ThemeProvider.tsx` | current runtime theme authority for theme classes, dark mode, density, localStorage restore, and `/api/preferences` hydration |
| `src/components/ThemeSwitcher.tsx` | current user-facing theme selector still owns a local hard-coded theme array |
| `src/core/use-cases/ThemeManagementInteractor.ts` | current parallel source of theme metadata and theme list semantics |
| `src/core/use-cases/tools/set-theme.tool.ts` | narrow UI tool schema for selecting a named theme |
| `src/core/use-cases/tools/adjust-ui.tool.ts` | broader UI tool schema for density, accessibility, dark mode, and optional theme changes |
| `src/hooks/useUICommands.ts` | live runtime command application path for `set_theme` and `adjust_ui` |
| `src/adapters/ChatPresenter.ts` | tool-call to UI-command mapping for theme-related commands |
| `src/hooks/useUICommands.test.tsx` | current command replay and persistence-adjacent coverage |
| `src/core/use-cases/ThemeManagementInteractor.test.ts` | current metadata validation and theme-list coverage |
| `docs/theme-brand-audit.md` | stale descriptive theme audit that still documents a non-runtime `Postmodern` theme |
| `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` | canonical refactor spec that Sprint 0 should make implementation-ready |

---

## Task 0.1 — Correct stale theme documentation

**What:** Bring the theme audit and any immediately adjacent theme docs back in line with the shipped runtime so Sprint 1 does not begin from contradictory documentation.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/theme-brand-audit.md` |
| **Modify** | `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` only if runtime wording or references still drift after doc correction |
| **Spec** | §1, §2.2.4, §6.1, Done 10 |

### Required corrections

1. Remove or explicitly retire the `Postmodern` theme from the runtime theme matrix.
2. Update any combination counts, risk tables, or recommendations that still assume five runtime themes.
3. Keep historically interesting design commentary only if it is clearly marked as non-runtime reference material rather than an active supported theme.
4. Do not invent new themes during this cleanup pass.

### Verify Task 0.1

```bash
test -f docs/theme-brand-audit.md
! rg -n "^### 2d\\. Postmodern$|\| \*\*Theme\*\* .*Postmodern|\| \*\*Postmodern\*\* |5 themes ×|5,400" docs/theme-brand-audit.md
```

Expected result:

1. any remaining `Postmodern` references in `docs/theme-brand-audit.md` are explicitly historical or removed
2. the doc no longer claims `Postmodern` is part of the active runtime theme set

---

## Task 0.2 — Freeze the current authority map in writing

**What:** Record the exact pre-manifest authority surfaces so Sprint 1 can remove duplication deliberately rather than by intuition.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` |
| **Modify** | this sprint doc |
| **Spec** | §2.2, §5.0, §5.1, §6.1 |

### Required inventory

Capture the current owners for each of these concerns explicitly:

1. theme membership and runtime union type
2. document-level class reset logic
3. user-facing theme labels and selector ordering
4. theme metadata and descriptive copy
5. tool schemas for `set_theme` and `adjust_ui`
6. UI command type definitions
7. command parsing and presenter mapping into UI commands
8. client application of theme commands
9. persistence and hydration paths

### Required file-level mapping

Sprint 0 should explicitly call out at least these files as authority surfaces:

1. `src/core/entities/theme.ts`
2. `src/components/ThemeProvider.tsx`
3. `src/components/ThemeSwitcher.tsx`
4. `src/core/use-cases/ThemeManagementInteractor.ts`
5. `src/core/use-cases/tools/set-theme.tool.ts`
6. `src/core/use-cases/tools/adjust-ui.tool.ts`
7. `src/core/use-cases/tools/UiTools.ts`
8. `src/core/entities/ui-command.ts`
9. `src/adapters/CommandParserService.ts`
10. `src/hooks/useUICommands.ts`
11. `src/adapters/ChatPresenter.ts`

### Verify Task 0.2

```bash
test -f docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md
```

Expected result:

1. the spec clearly identifies every live theme authority surface that Sprint 1 must unify
2. there is no ambiguity about where theme membership, metadata, selector labels, and persistence currently live

---

## Task 0.3 — Add baseline drift guards for selector and metadata ownership

**What:** Add the first focused tests that fail if the selector or theme metadata layer silently drifts before the manifest lands.

| Item | Detail |
| --- | --- |
| **Create or Modify** | `src/components/ThemeSwitcher.test.tsx` |
| **Modify** | `src/core/use-cases/ThemeManagementInteractor.test.ts` if needed to make the pre-manifest contract explicit |
| **Spec** | §5.1, §6.5, §7, Done 3, Done 5 |

### Required test intent

1. prove the user-facing selector exposes exactly the currently supported runtime themes
2. prove selector labels are intentional and stable enough to audit
3. prove theme metadata still covers the same supported theme IDs as runtime code
4. fail loudly if a theme is added to one authority layer but not the others

### Implementation notes

1. Do not over-design a permanent post-manifest test yet; this sprint only needs a guard against silent drift in the current architecture.
2. Prefer asserting against the current supported theme IDs rather than snapshotting large rendered trees.
3. Keep the test focused on authority alignment, not presentational styling.

### Verify Task 0.3

```bash
npm exec vitest run src/core/use-cases/ThemeManagementInteractor.test.ts src/components/ThemeSwitcher.test.tsx
```

---

## Task 0.4 — Freeze current command-boundary behavior before refactor

**What:** Document and verify the pre-manifest ownership split between `set_theme` and `adjust_ui` so Sprint 1 can intentionally preserve or migrate it.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` if current command ownership still lacks precision |
| **Modify** | `src/core/use-cases/tools/UiTools.test.ts` |
| **Modify** | `src/hooks/useUICommands.test.tsx` only if a focused missing baseline case is discovered |
| **Spec** | §5.0, §5.5, §6.5, Done 4 |

### Required baseline assertions

1. `set_theme` remains a narrow named-theme command
2. `adjust_ui` remains the broader surface for density, dark mode, presets, color-blind settings, and optional theme persistence
3. authenticated persistence still routes through the broader UI-adjustment path
4. the parser and UI-command type layer still reflect the current pre-manifest command boundary
5. the repo does not accidentally start broadening `set_theme` before the manifest contract is defined

### Implementation notes

1. Add or update a focused `AdjustUICommand` test in `src/core/use-cases/tools/UiTools.test.ts` that proves authenticated contexts write theme-related preferences through `preferencesRepo.set(...)`.
2. Keep the tool-level persistence assertion separate from the client `useUICommands` tests; client tests prove command application, not authenticated repository writes.
3. Include `src/adapters/CommandParserService.test.ts` in the verification path so the pre-manifest parser contract is frozen explicitly rather than inferred.
4. `src/hooks/useUICommands.test.tsx` and `src/adapters/ChatPresenter.test.ts` should remain in the verification path because they still prove command routing and client application behavior.

### Verify Task 0.4

```bash
npm exec vitest run src/core/use-cases/tools/UiTools.test.ts src/adapters/CommandParserService.test.ts src/hooks/useUICommands.test.tsx src/adapters/ChatPresenter.test.ts
```

---

## Task 0.5 — Record hotspot extraction order for Sprint 2+

**What:** Turn the current hotspot list into an ordered execution map so later semantic-surface work does not expand blindly.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` |
| **Modify** | this sprint doc |
| **Spec** | §2.3, §6.3, §9 |

### Required ordering output

Group the hotspot files into at least these buckets:

1. chat transcript and composer surfaces
2. shell and account chrome
3. jobs desk panels and cards
4. journal and profile polished surfaces

For each bucket, record:

1. why it is high leverage
2. whether it is selector-sensitive, command-sensitive, or purely visual
3. whether browser verification is mandatory before the bucket can be considered complete

### Verify Task 0.5

```bash
test -f docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md
```

---

## Sprint 0 Verification Bundle

Run this bundle before marking the sprint complete:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/core/use-cases/ThemeManagementInteractor.test.ts src/components/ThemeSwitcher.test.tsx src/core/use-cases/tools/UiTools.test.ts src/adapters/CommandParserService.test.ts src/hooks/useUICommands.test.tsx src/adapters/ChatPresenter.test.ts
```

If Sprint 0 modifies only docs and adds the selector-level guard without code-path changes, `npm run build` is optional at this stage and becomes mandatory again in Sprint 1.

---

## Completion Checklist

- [ ] `docs/theme-brand-audit.md` no longer describes non-runtime themes as shipped runtime choices
- [ ] the current theme authority map is documented concretely enough to drive Sprint 1
- [ ] selector-level drift guard exists
- [ ] metadata-level drift guard exists
- [ ] command-boundary baseline is explicit before manifest extraction starts
- [ ] hotspot extraction order is documented for later semantic-surface sprints

## Sprint 0 Exit Criteria

Sprint 0 is complete only when the repo has a trustworthy, documented answer to
all of the following:

1. what themes are actually supported right now
2. which files currently own theme membership, metadata, labels, and persistence
3. how the selector, parser, runtime state, and tool schemas can drift today
4. what tests will fail if that drift starts before the manifest lands

If any of those answers still depends on chat history or tribal knowledge,
Sprint 0 is not complete.
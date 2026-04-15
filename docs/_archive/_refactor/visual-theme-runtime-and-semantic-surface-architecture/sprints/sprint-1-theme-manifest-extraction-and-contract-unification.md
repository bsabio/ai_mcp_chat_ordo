# Sprint 1 - Theme Manifest Extraction And Contract Unification

> **Goal:** Introduce a manifest-backed theme authority and remove the current duplication between the runtime theme union, selector labels, metadata interactor, and tool schemas.
> **Spec ref:** §2.2, §3, §5.0, §5.1, §5.1.1, §5.5, §6.2, §6.5, §7, Done 1, Done 2, Done 3, Done 5
> **Prerequisite:** Sprint 0 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/core/entities/theme.ts` | current compile-time union for the four supported runtime themes |
| `src/components/ThemeProvider.tsx` | current runtime owner for document class reset, localStorage restore, dark-mode state, and `/api/preferences` hydration |
| `src/components/ThemeSwitcher.tsx` | current user-facing selector with a local hard-coded `{ id, label }[]` theme list |
| `src/core/use-cases/ThemeManagementInteractor.ts` | current parallel source of descriptive theme metadata and theme-list semantics |
| `src/core/use-cases/tools/set-theme.tool.ts` | current narrow theme schema with a duplicated hard-coded enum |
| `src/core/use-cases/tools/adjust-ui.tool.ts` | broader UI-adjustment schema with its own duplicated hard-coded theme enum |
| `src/core/use-cases/tools/tool-schema-compatibility.test.ts` | existing schema-focused test home that can absorb manifest-backed theme enum assertions without inventing a new test surface |
| `src/hooks/useUICommands.ts` | current client application path for `set_theme` and `adjust_ui` theme values |
| `src/core/use-cases/tools/UiTools.ts` | current runtime command execution path where authenticated preference persistence is already separated from schema ownership |
| `src/components/ThemeSwitcher.test.tsx` | Sprint 0 selector-level drift guard for supported theme IDs and labels |
| `src/core/use-cases/ThemeManagementInteractor.test.ts` | Sprint 0 metadata-level drift guard for supported theme IDs |
| `src/core/use-cases/tools/UiTools.test.ts` | Sprint 0 command-boundary and authenticated persistence coverage |
| `src/adapters/CommandParserService.test.ts` | Sprint 0 parser-boundary freeze for legacy text commands |

---

## QA Findings Before Implementation

1. The same four theme IDs are currently duplicated in at least five active authority surfaces: the `Theme` union, `ThemeProvider` class-reset list, `ThemeSwitcher` selector array, `ThemeManagementInteractor` metadata map, and both UI tool schemas.
2. `ThemeProvider` currently owns runtime application behavior and persistence restore, but it does not own the descriptive labels or metadata used elsewhere, so a new theme could still land incompletely even after Sprint 0.
3. `set_theme` and `adjust_ui` already have a valid responsibility split, but both schemas manually repeat the same theme enum. Sprint 1 needs to unify membership without broadening command ownership.
4. The current selector-level and metadata-level tests freeze the pre-manifest state, but Sprint 1 must deliberately replace those assumptions with manifest-backed assertions rather than leave the tests coupled to duplicated lists.
5. The parent spec requires future MCP-safe inspection of theme profiles and token groups. Sprint 1 therefore needs to create a manifest structure that can grow without forcing another authority migration in Sprint 2.

---

## Task 1.1 - Create the manifest-backed theme authority

**What:** Introduce one typed manifest module that owns the supported theme IDs, user-facing labels, descriptive metadata, and any manifest helpers needed by runtime consumers.

| Item | Detail |
| --- | --- |
| **Create** | `src/lib/theme/theme-manifest.ts` |
| **Modify** | `src/core/entities/theme.ts` |
| **Modify** | `src/core/use-cases/ThemeManagementInteractor.ts` |
| **Spec** | §5.1, §5.1.1, §6.2 |

### Required outcomes

1. Define the canonical supported theme list exactly once in the manifest.
2. Make the exported `Theme` type derive from the manifest-backed authority rather than from a separately maintained string union.
3. Move current theme labels, year ranges, descriptions, and primary attributes behind manifest-backed metadata helpers so `ThemeManagementInteractor` no longer owns an independent ID map.
4. Expose at minimum a manifest-backed ordered theme ID list and a theme metadata lookup helper so runtime and tool layers can consume the same ordering intentionally.
5. Keep the manifest small and typed. Sprint 1 is not yet the full semantic-token extraction sprint.

### Implementation notes

1. The manifest should stay close to runtime concerns, not become an open-ended design encyclopedia.
2. If the interactor remains, it should become a thin adapter over the manifest rather than a second source of truth.
3. The manifest should preserve the current selector order unless there is a deliberate spec change recorded in this sprint.

### Verify Task 1.1

```bash
npm exec vitest run src/core/use-cases/ThemeManagementInteractor.test.ts
```

Expected result:

1. theme metadata remains available through the current interactor surface or an intentionally equivalent adapter
2. the supported theme IDs are sourced from the manifest rather than re-declared locally

---

## Task 1.2 - Unify selector and provider runtime ownership around the manifest

**What:** Remove local theme-list duplication from the user-facing selector and the provider runtime class-reset path so the manifest becomes the runtime authority instead of just a metadata source.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/ThemeProvider.tsx` |
| **Modify** | `src/components/ThemeSwitcher.tsx` |
| **Modify** | `src/components/ThemeSwitcher.test.tsx` |
| **Create or Modify** | `src/components/ThemeProvider.test.tsx` if a direct runtime authority guard is needed |
| **Spec** | §5.1, §6.2, §6.5 |

### Required outcomes

1. `ThemeProvider` uses a manifest-backed theme ID list for document class reset rather than a local array.
2. `ThemeSwitcher` renders its ordered theme buttons from the same manifest-backed authority rather than a local hard-coded selector array.
3. The selector-level guard continues to prove that the user-facing labels and the supported theme IDs are aligned, but its assertions should now reflect manifest-backed ownership explicitly.
4. `ThemeProvider` validates or safely ignores non-manifest theme values coming from `localStorage` and `/api/preferences` hydration instead of trusting stale string casts.
5. No behavioral change should occur to theme switching, dark mode, or valid preference hydration in this sprint.

### Implementation notes

1. Keep Sprint 1 scoped to authority unification. Do not refactor unrelated accessibility preset logic into the manifest yet unless a small helper extraction is required to avoid obvious drift.
2. If a runtime validation helper is needed for safely reading `localStorage` theme values, prefer a manifest-backed helper over repeated string checks.
3. Preserve the current public labels unless the team intentionally changes copy in a separately documented decision.
4. If there is still no direct provider-level test after implementation, Sprint 1 should add one proving invalid stored theme values do not produce invalid document classes.

### Verify Task 1.2

```bash
npm exec vitest run src/components/ThemeSwitcher.test.tsx src/hooks/useUICommands.test.tsx
npm exec vitest run src/components/ThemeProvider.test.tsx
```

---

## Task 1.3 - Unify tool schemas without collapsing the command boundary

**What:** Make both theme-related tool schemas consume the same manifest-backed supported-theme list while preserving the current split between narrow `set_theme` and broader `adjust_ui` ownership.

| Item | Detail |
| --- | --- |
| **Modify** | `src/core/use-cases/tools/set-theme.tool.ts` |
| **Modify** | `src/core/use-cases/tools/adjust-ui.tool.ts` |
| **Modify** | `src/core/use-cases/tools/tool-schema-compatibility.test.ts` or create an equivalent focused schema test |
| **Modify** | `src/core/use-cases/tools/UiTools.test.ts` only if the manifest migration exposes a missing schema-alignment case |
| **Spec** | §5.0, §5.1, §5.5, §6.2, §6.5 |

### Required outcomes

1. The theme enum exposed by `set_theme` derives from the manifest-backed supported-theme list.
2. The optional `theme` field inside `adjust_ui` derives from the same manifest-backed source.
3. Focused schema tests prove those exported enum values match the manifest-backed supported-theme list exactly.
4. Sprint 1 must not use the manifest migration as an excuse to broaden `set_theme` into density, accessibility, or persistence ownership.
5. Authenticated persistence remains with the broader UI-adjustment path unless the spec is deliberately changed in a later sprint.

### Implementation notes

1. A small shared helper that converts manifest-backed theme IDs into JSON schema enum values is acceptable if it reduces duplication cleanly.
2. Keep schema output deterministic so MCP-facing behavior remains stable.
3. If schema typing becomes awkward, prefer a tiny manifest helper instead of reintroducing local arrays near the tool files.

### Verify Task 1.3

```bash
npm exec vitest run src/core/use-cases/tools/UiTools.test.ts src/core/use-cases/tools/tool-schema-compatibility.test.ts src/adapters/CommandParserService.test.ts src/adapters/ChatPresenter.test.ts
```

Expected result:

1. command-boundary tests still prove `set_theme` is narrow
2. authenticated persistence behavior for `adjust_ui` remains unchanged
3. schema-level tests prove both tool enums are generated from the manifest-backed theme set
4. no parser or presenter contract starts depending on a second theme list

---

## Task 1.4 - Replace pre-manifest drift guards with manifest-backed authority guards

**What:** Update focused tests so they no longer merely freeze duplicated state, but instead prove the manifest is the single active authority surface for runtime theme membership.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/ThemeSwitcher.test.tsx` |
| **Modify** | `src/core/use-cases/ThemeManagementInteractor.test.ts` |
| **Create or Modify** | focused manifest tests if the implementation needs direct manifest coverage |
| **Spec** | §5.1, §6.2, §6.5, §7 |

### Required outcomes

1. The tests fail if a theme is added to the manifest but not exposed through selector or metadata consumers.
2. The tests fail if a consumer attempts to maintain its own independent supported-theme list again.
3. The assertions stay small and authority-focused rather than snapshot-heavy.
4. If direct manifest tests are added, they should verify order and metadata completeness, not styling implementation.

### Verify Task 1.4

```bash
npm exec vitest run src/core/use-cases/ThemeManagementInteractor.test.ts src/components/ThemeSwitcher.test.tsx src/components/ThemeProvider.test.tsx src/core/use-cases/tools/UiTools.test.ts src/core/use-cases/tools/tool-schema-compatibility.test.ts
```

---

## Sprint 1 Verification Bundle

Run this bundle before marking Sprint 1 complete:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/core/use-cases/ThemeManagementInteractor.test.ts src/components/ThemeSwitcher.test.tsx src/components/ThemeProvider.test.tsx src/core/use-cases/tools/UiTools.test.ts src/core/use-cases/tools/tool-schema-compatibility.test.ts src/adapters/CommandParserService.test.ts src/hooks/useUICommands.test.tsx src/adapters/ChatPresenter.test.ts src/components/AppShell.test.tsx src/components/SiteNav.test.tsx tests/blog-hero-rendering.test.tsx tests/deferred-job-status.tool.test.ts tests/job-status-summary-tools.test.ts
npm run build
```

Sprint 1 is the first sprint in this workstream where `npm run build` becomes mandatory again because the manifest begins changing runtime ownership paths rather than only docs and guard tests.

---

## Completion Checklist

- [x] manifest-backed theme authority exists
- [x] `Theme` membership derives from the manifest-backed source rather than a separate union declaration
- [x] `ThemeProvider` and `ThemeSwitcher` no longer maintain local supported-theme lists
- [x] manifest-backed authority exports are exposed as readonly runtime contracts rather than mutable arrays
- [x] invalid stored or hydrated theme values are rejected or ignored through manifest-backed validation rather than string casts
- [x] theme metadata no longer owns a separate theme ID map
- [x] `set_theme` and `adjust_ui` derive supported theme enums from the same manifest-backed source
- [x] focused schema tests prove those tool enums match the manifest-backed theme list exactly
- [x] focused tests prove the manifest is the single authority for runtime theme membership
- [x] unsupported theme values are rejected across parser, presenter, and client command-application ingress paths
- [x] repo-wide verification bundle is green, including `npm run build`

## Post-Implementation QA Hardening

After the first green Sprint 1 bundle, a deeper QA pass found two remaining authority gaps that still made the runtime weaker than the spec required.

1. Unsupported theme strings could still enter through the UI-command path even after the manifest migration because parser output, presenter tool-call mapping, and client command application were not all validating against the same manifest-backed runtime helper.
2. The manifest-backed authority arrays were exported in a form that could still be mutated by runtime consumers, which weakened the claim that the manifest was the only safe authority surface.

The final Sprint 1 hardening pass closed both gaps:

1. manifest-backed authority exports were frozen and treated as readonly runtime contracts
2. parser, presenter, and `useUICommands` now reject or sanitize unsupported theme values before they can reach `setTheme`
3. regression tests were added for unsupported legacy text commands, unsupported structured tool-call theme values, and invalid client-side UI commands
4. `ChatPresenter` now clones parser-returned command arrays before sanitizing them so command normalization cannot mutate shared parser results across calls or tests

## QA Result

Verified on 2026-03-26 with:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/core/use-cases/ThemeManagementInteractor.test.ts src/components/ThemeSwitcher.test.tsx src/components/ThemeProvider.test.tsx src/core/use-cases/tools/UiTools.test.ts src/core/use-cases/tools/tool-schema-compatibility.test.ts src/adapters/CommandParserService.test.ts src/hooks/useUICommands.test.tsx src/adapters/ChatPresenter.test.ts src/components/AppShell.test.tsx src/components/SiteNav.test.tsx tests/blog-hero-rendering.test.tsx tests/deferred-job-status.tool.test.ts tests/job-status-summary-tools.test.ts
npm run build
```

Observed result:

1. `npm run typecheck` passed.
2. `npm run lint:css` passed.
3. The focused Sprint 1 suite passed.
4. `npm run build` passed.
5. Post-implementation hardening regressions for parser, presenter, client command application, and provider hydration all passed.

## Sprint 1 Exit Criteria

Sprint 1 is complete only when the repo has one authoritative answer to all of the following:

1. which themes exist
2. what order and labels the user-facing selector should show
3. what metadata those themes expose to runtime and future MCP control layers
4. what theme enum values MCP-safe tool schemas are allowed to accept
5. how runtime class reset and selector rendering stay aligned with those same values

If any of those answers still depends on duplicated local arrays or local object maps, Sprint 1 is not complete.
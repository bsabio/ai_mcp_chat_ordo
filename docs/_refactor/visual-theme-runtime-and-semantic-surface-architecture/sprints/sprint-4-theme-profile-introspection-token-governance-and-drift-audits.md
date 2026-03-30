# Sprint 4 - Theme Profile Introspection, Token Governance, And Drift Audits

> **Goal:** Finish the manifest-backed design-system contract by enriching theme profiles with inspectable semantic token and intent metadata, exposing a bounded read-only inspection surface, and adding governance and performance drift audits so the workstream is comprehensive rather than only extraction-complete.
> **Spec ref:** §5.1, §5.2, §5.5, §5.6, §6.5, §6.6, §7, §8, §9
> **Prerequisite:** Sprint 3 complete

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/lib/theme/theme-manifest.ts` | current manifest-backed authority now unifies theme IDs, selector labels, and descriptive metadata, but it does not yet expose semantic token groups, motion intent, shadow intent, density defaults, or approved control axes |
| `src/core/entities/theme.ts` | runtime `Theme` type already derives from the manifest-backed ID union |
| `src/core/use-cases/ThemeManagementInteractor.ts` | thin metadata adapter over the manifest that can absorb richer theme-profile access without reviving a second source of truth |
| `src/components/ThemeProvider.tsx` | runtime owner for document theme classes, dark-mode state, CSS-variable accessibility settings, density attributes, and persisted preference hydration |
| `src/components/ThemeSwitcher.tsx` | user-facing selector already derives its ordered theme options from the manifest-backed selector list |
| `src/core/use-cases/tools/set-theme.tool.ts` | bounded mutation tool for named theme changes only |
| `src/core/use-cases/tools/adjust-ui.tool.ts` | broader bounded mutation tool for density, dark mode, presets, color-blind settings, and optional theme changes |
| `src/core/use-cases/tools/UiTools.ts` | current command boundary still only supports mutation-oriented theme operations; there is no read-only inspection surface yet |
| `src/hooks/useUICommands.ts` | client command application already validates manifest-backed theme values before applying them |
| `src/core/use-cases/tools/tool-schema-compatibility.test.ts` | current schema-level proof that mutation tools share the same manifest-backed supported-theme list |
| `src/components/ThemeProvider.test.tsx` | current runtime guard for provider hydration, invalid stored themes, and remount continuity |
| `src/components/ThemeSwitcher.test.tsx` | current selector-integrity guard for manifest-backed theme membership and labels |
| `src/core/use-cases/ThemeManagementInteractor.test.ts` | current metadata guard that can be expanded into a richer profile-completeness test |
| `docs/theme-brand-audit.md` | runtime-facing theme reference doc that currently covers theme identity but not a formal supported control or token-profile contract |

---

## QA Findings Before Implementation

1. The current manifest unifies theme IDs and descriptive labels, but it still stops short of the richer contract promised by the parent spec: semantic token groups, surface intent, motion intent, shadow intent, density defaults, and approved control axes are not yet first-class manifest data.
2. `set_theme` and `adjust_ui` are now manifest-backed and bounded, but the workstream still lacks a dedicated read-only inspection surface for supported theme profiles and safe theme-control metadata.
3. The current QA story proves behavior through runtime, schema, and build tests, but it does not yet install explicit governance checks against reintroducing local theme lists or drifting covered hotspot surfaces back to duplicated shared visual formulas.
4. `ThemeProvider` still enforces the performance contract mainly by implementation discipline. Sprint 4 should make the guardrails explicit: document-level theme application, CSS-variable ownership, and no shared-surface runtime style generation.
5. The current sprint set is strong on extraction and mutation hardening, but it does not yet provide one maintained, inspectable description of what the supported theme system actually exposes to operators, MCP consumers, and future tooling.

---

## Task 4.1 - Enrich the manifest into a real theme-profile contract

**What:** Expand the manifest from a membership-and-label source into the authoritative profile contract the parent spec originally described.

| Item | Detail |
| --- | --- |
| **Modify** | `src/lib/theme/theme-manifest.ts` |
| **Modify** | `src/core/use-cases/ThemeManagementInteractor.ts` |
| **Modify as needed** | `src/core/entities/theme.ts` |
| **Create or Modify** | focused manifest/profile tests such as `src/lib/theme/theme-manifest.test.ts` |
| **Modify** | `src/core/use-cases/ThemeManagementInteractor.test.ts` |
| **Spec** | §5.1, §5.2, §6.6, Done 1, Done 11 |

### Required outcomes for Task 4.1

1. Each theme profile exposes manifest-backed semantic token groups rather than only descriptive copy.
2. Theme profiles record intent metadata needed by future safe tooling, including at minimum motion intent, shadow intent, density defaults, and approved control axes.
3. The approved control-axis list is explicit and grounded in the current runtime contract: named theme selection, dark-mode toggle, density, font size, line height, letter spacing, color-blind mode, and the existing bounded UI presets.
4. Accessibility-relevant compatibility information is explicit enough that future tooling does not have to infer whether a profile meaningfully supports dark mode, dense layouts, or color-blind-safe adjustment paths.
5. `ThemeManagementInteractor` becomes a thin reader over that richer manifest-backed contract rather than a second metadata authority.
6. Focused tests prove every supported theme has a complete profile and that profile ordering remains intentional.

### Implementation notes for Task 4.1

1. Keep the profile contract runtime-relevant. Sprint 4 should not turn the manifest into an unbounded style encyclopedia.
2. Token groups should be semantic and inspectable, not raw CSS dumps.
3. If profile metadata grows, prefer readonly exported helpers over mutable nested objects that downstream code can alter accidentally.

### Verify Task 4.1

```bash
npm exec vitest run src/lib/theme/theme-manifest.test.ts src/core/use-cases/ThemeManagementInteractor.test.ts
```

---

## Task 4.2 - Add a bounded read-only theme inspection surface

**What:** Expose supported theme profiles and safe control metadata through a read-only interface rather than forcing future tooling to reverse-engineer the manifest or piggyback on mutation commands.

| Item | Detail |
| --- | --- |
| **Create or Modify** | a read-only theme inspection seam such as `src/core/use-cases/tools/inspect-theme.tool.ts` |
| **Modify as needed** | `src/core/use-cases/tools/tool-schema-compatibility.test.ts` |
| **Modify as needed** | `src/adapters/ChatPresenter.test.ts` if inspection results surface through chat summaries or cards |
| **Modify as needed** | `src/core/use-cases/tools/UiTools.ts` only if shared theme-profile helpers belong there rather than in a dedicated read-only tool |
| **Spec** | §5.5, §6.5, §6.6, Done 4, Done 11 |

### Required outcomes for Task 4.2

1. The repo exposes a read-only, MCP-safe way to inspect supported theme profiles and control metadata.
2. Mutation authority remains unchanged: `set_theme` still selects named themes and `adjust_ui` still owns broader UI adjustments and persistence.
3. If the inspection surface can report an active theme, it must do so with explicit provenance rather than pretending server defaults, persisted preferences, and client runtime state are the same thing.
4. The minimum inspection payload is explicit and compact: supported theme IDs, ordered theme profiles, approved control axes, and optional active-theme state only when provenance is available.
5. The inspection schema is generated from manifest-backed profile data instead of hand-maintained documentation objects.
6. Focused tests prove the inspection surface cannot mutate theme state and stays aligned with the manifest-backed profile contract.

### Implementation notes for Task 4.2

1. Prefer a dedicated read-only tool over overloading `set_theme` or `adjust_ui` with non-mutation behavior.
2. Keep the return shape concise and operator-usable. The goal is safe inspection, not raw token dumping.
3. If active-theme readback is not available from a reliable source in a given execution path, the tool should report supported themes only and say so explicitly.

### Verify Task 4.2

```bash
npm exec vitest run src/core/use-cases/tools/tool-schema-compatibility.test.ts src/core/use-cases/tools/inspect-theme.tool.test.ts src/adapters/ChatPresenter.test.ts
```

---

## Task 4.3 - Install governance and performance drift audits

**What:** Add focused audit coverage so the refactor cannot quietly slip back into duplicated theme authority or shared-surface visual sprawl.

| Item | Detail |
| --- | --- |
| **Create** | a focused static audit such as `tests/sprint-4-theme-governance-qa.test.ts` |
| **Modify as needed** | `src/components/ThemeProvider.test.tsx` |
| **Modify as needed** | `src/components/ThemeSwitcher.test.tsx` |
| **Modify as needed** | `src/hooks/useUICommands.test.tsx` |
| **Spec** | §5.6, §6.6, §7, Done 7, Done 8, Done 12 |

### Required outcomes for Task 4.3

1. A focused audit fails if covered runtime consumers reintroduce local supported-theme arrays or duplicate manifest-backed authority maps.
2. A focused audit fails if covered hotspot surfaces regress back to large shared visual formulas that should belong to semantic CSS primitives.
3. Provider-level tests make the performance contract explicit by proving theme application remains document-level and CSS-variable driven.
4. UI-command tests continue to prove that only manifest-backed supported theme values can execute.
5. The resulting audit layer is small, deterministic, and specific to this workstream rather than a vague style-lint substitute.

Covered hotspot scope for the audit should stay intentionally narrow and explicit:

1. `src/frameworks/ui/MessageList.tsx`
2. `src/frameworks/ui/ChatInput.tsx`
3. `src/components/jobs/JobsPagePanel.tsx`
4. `src/components/journal/PublicJournalPages.tsx`
5. `src/components/SiteNav.tsx`
6. the semantic surface owners in `src/app/styles/chat.css`, `src/app/styles/jobs.css`, `src/app/styles/editorial.css`, and `src/app/styles/shell.css`

### Implementation notes for Task 4.3

1. Keep the audit set focused on the files and contracts this refactor actually owns.
2. Prefer a few direct structural checks over a sprawling snapshot of source code.
3. If a hotspot legitimately needs a new local visual branch, the sprint should capture why that branch is not a shared-surface regression.

### Verify Task 4.3

```bash
npm exec vitest run src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/hooks/useUICommands.test.tsx tests/sprint-4-theme-governance-qa.test.ts
```

---

## Task 4.4 - Document the supported theme-control and profile contract

**What:** Make the shipped theme-control surface auditable in docs so future MCP and design-system work does not have to infer supported controls from code.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/theme-brand-audit.md` |
| **Modify as needed** | `docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md` |
| **Modify** | this sprint doc |
| **Spec** | §5.5, §6.5, §6.6, Done 10 |

### Required outcomes for Task 4.4

1. Runtime-facing docs state which controls are supported today and which remain intentionally unsupported.
2. Theme-profile docs describe the inspectable manifest contract at the same level of truth as the runtime.
3. Docs distinguish read-only theme inspection from mutation tools so operators and future agents do not conflate them.
4. Docs explicitly enumerate the currently supported control axes: theme, dark mode, density, font size, line height, letter spacing, color-blind mode, and bounded presets.
5. Sprint 4 records any intentionally deferred control axes rather than leaving them implied.

### Verify Task 4.4

```bash
test -f docs/theme-brand-audit.md
test -f docs/_refactor/visual-theme-runtime-and-semantic-surface-architecture/spec.md
```

---

## Sprint 4 Verification Bundle

Run this bundle before marking Sprint 4 complete:

```bash
npm run typecheck
npm run lint:css
npm exec vitest run src/lib/theme/theme-manifest.test.ts src/core/use-cases/ThemeManagementInteractor.test.ts src/components/ThemeProvider.test.tsx src/components/ThemeSwitcher.test.tsx src/core/use-cases/tools/tool-schema-compatibility.test.ts src/core/use-cases/tools/inspect-theme.tool.test.ts src/hooks/useUICommands.test.tsx src/adapters/ChatPresenter.test.ts tests/sprint-4-theme-governance-qa.test.ts
npm run build
```

If Sprint 4 introduces UI or chat-surface rendering for theme inspection that materially changes browser behavior, add the smallest focused browser suite that proves those new affordances do not regress route tone or command application.

---

## Completion Checklist

- [ ] manifest-backed theme profiles expose semantic token and intent metadata rather than only descriptive labels
- [ ] read-only theme inspection exists without broadening mutation-tool authority
- [ ] mutation boundaries for `set_theme` and `adjust_ui` remain explicit and unchanged
- [ ] governance tests fail when local theme lists or covered shared-surface regressions reappear
- [ ] provider-level tests make the document-level performance contract explicit
- [ ] runtime-facing docs describe the supported theme-control and profile contract truthfully
- [ ] Sprint 4 verification bundle is green, including `npm run build`

## Sprint 4 Exit Criteria

Sprint 4 is complete only when the repo has one clear answer to all of the following remaining workstream questions:

1. what inspectable metadata each supported theme profile exposes beyond name and label
2. how future MCP-safe tooling can read supported theme profiles without mutating UI state
3. what prevents runtime consumers from reintroducing duplicate theme lists or undoing semantic surface ownership on covered hotspots
4. how the performance contract remains explicit after semantic extraction is complete
5. where the runtime-facing documentation for supported theme controls now lives

If those answers still depend on code archaeology instead of one maintained contract, the workstream is not yet comprehensive.

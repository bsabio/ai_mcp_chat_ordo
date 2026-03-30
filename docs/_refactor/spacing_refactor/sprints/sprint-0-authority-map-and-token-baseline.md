# Sprint 0 — Authority Map And Token Baseline

> **Goal:** Freeze the current spacing authority map, introduce the first modular ladder and semantic role-token layer, and add audit guardrails before any large surface migration begins.
> **Spec ref:** §1, §2, §4, §6, §7.1, §8
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/spacing_refactor/spec.md` | canonical spacing refactor contract defining the modular ladder, role families, migration phases, and acceptance criteria |
| `docs/_refactor/spacing_refactor/census.md` | current-state spacing audit showing governed vs. drifting surfaces |
| `src/app/styles/foundation.css` | live global spacing authority containing phi tokens, shell spacing tokens, hero spacing tokens, chat spacing tokens, and density state overrides |
| `src/components/SiteNav.tsx` | strongest current example of tokenized shell spacing |
| `src/components/AccountMenu.tsx` | shell dropdown and account rail surface with partial semantic spacing ownership |
| `src/frameworks/ui/ChatInput.tsx` | strongest current example of tokenized chat composer spacing |
| `src/frameworks/ui/MessageList.tsx` | high-leverage mixed surface where semantic chat tokens and literal spacing currently coexist |
| `src/components/jobs/JobsPagePanel.tsx` | representative mixed grammar surface for cards, detail panels, and section rhythm |
| `src/components/journal/JournalLayout.tsx` | representative editorial surface with strong visual intent and weak shared spacing ownership |
| `stylelint.config.mjs` | existing CSS lint entrypoint already in the repo quality path |
| `package.json` | script authority for lint and verification workflows |

---

## Task 0.1 — Freeze the current spacing authority map

**What:** Record the exact pre-migration ownership model so later sprints do not guess where spacing truth currently lives.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/spacing_refactor/spec.md` only if authority wording remains ambiguous during implementation |
| **Modify** | `docs/_refactor/spacing_refactor/census.md` if file-level evidence is refined during delivery |
| **Modify** | this sprint doc |
| **Spec** | §1.2, §2, §6.1, §6.2 |

### Required authority inventory

Document these current authority layers explicitly:

1. global low-level spacing tokens in `src/app/styles/foundation.css`
2. existing shell-specific spacing tokens
3. existing hero and chat spacing tokens
4. current runtime density ownership through `data-density`
5. files that already consume semantic spacing tokens correctly
6. files that expose semantic hooks but still rely on literal spacing
7. surfaces with no meaningful spacing token ownership yet

### Required file-level mapping

Sprint 0 should treat at least these files as the pre-migration authority map:

1. `src/app/styles/foundation.css`
2. `src/components/SiteNav.tsx`
3. `src/components/AccountMenu.tsx`
4. `src/frameworks/ui/ChatHeader.tsx`
5. `src/frameworks/ui/ChatInput.tsx`
6. `src/frameworks/ui/ChatMessageViewport.tsx`
7. `src/frameworks/ui/MessageList.tsx`
8. `src/components/jobs/JobsPagePanel.tsx`
9. `src/components/journal/JournalLayout.tsx`
10. `src/app/admin/journal/page.tsx`
11. `src/app/admin/journal/[id]/page.tsx`
12. `src/frameworks/ui/RichContentRenderer.tsx`

### Verify Task 0.1

```bash
test -f docs/_refactor/spacing_refactor/census.md
test -f docs/_refactor/spacing_refactor/spec.md
```

Expected result:

1. the repo has a concrete written answer for where spacing truth currently lives
2. future migration work no longer depends on chat history or local intuition

---

## Task 0.2 — Introduce the operational modular ladder and role-token baseline

**What:** Add the first implementation-grade spacing ladder and semantic role-token layer without yet migrating the broader product surface families.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/styles/foundation.css` |
| **Spec** | §4.1, §4.3, §4.4, §6.1, §6.2 |

### Required implementation

1. Add the modular ladder tokens defined by the spec: `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-6`, `--space-8`, `--space-10`, `--space-12`, and `--space-16`.
3. **Delete** existing shell and chat token definitions (e.g. `--shell-rail-gap`) and replace them purely with the new `--space-*` semantic role tokens across all `.tsx` and `.css` sheets. *Do not use CSS aliases.*
4. **Register tokens via `@property`**: Define the new spacing ladder and semantic hooks using CSS Houdini `@property` blocks in `foundation.css` (syntax: `"<length>"`) to match the new color-token architecture. *Do not include spacing tokens in the global layout transition to prevent layout jitter during theme swaps.*
5. Keep phi tokens intact in Sprint 0 only where they act as macro-compositional drivers, but replace them as the everyday grammar for standard spacing.
6. Wire the current density states so the new semantic role families respond to `compact`, `default`, and `relaxed` rather than staying hard-coded to one scale.

### Task 0.2 Implementation Notes

1. **Ban aliasing**. Rewrite existing shell/chat `.tsx` consumers directly. As a greenfield system, we do not want to leave behind 40+ legacy variable names just to protect component uptime during a refactor.
2. Directly convert route and component files to the new `--space-*` and `--layout-*` names.
3. Keep naming consistent with the spec so later lint and migration work can rely on stable token names.
4. Avoid creating a second parallel spacing system in a new file unless there is a clear reason to split `foundation.css` immediately.

### Verify Task 0.2

```bash
npm run lint:css
```

Expected result:

1. the global style layer exposes a real operational ladder and semantic spacing roles
2. existing shell and chat consumers continue to work without broad regressions

---

## Task 0.3 — Add a spacing drift audit for governed surfaces

**What:** Create the first guardrail that identifies unauthorized literal spacing in the surfaces this refactor is intended to govern.

| Item | Detail |
| --- | --- |
| **Modify** | `package.json` |
| **Create or Modify** | a lightweight script under `scripts/` if needed for audit output |
| **Spec** | §6.3, §8.2 |

### Required audit behavior

1. Scan governed UI folders for bare spacing utilities such as `gap-*`, `p-*`, `px-*`, `py-*`, `space-x-*`, and `space-y-*`.
2. Start with reporting mode in Sprint 0 rather than failing the entire repo on legacy debt.
3. Scope the first audit to high-leverage UI folders where the migration will land first, preferably:
   - `src/components/`
   - `src/frameworks/ui/`
   - route UI in `src/app/`
4. Allow clearly documented exclusions for surfaces that have not yet migrated.
5. Produce output that is stable enough to use as a regression baseline in later sprints.

### Task 0.3 Implementation Notes

1. Sprint 0 should not try to enforce a zero-literal-spacing repo. It should create a trustworthy baseline and a repeatable audit command.
2. Prefer a small script or deterministic search-based audit over a complex custom lint plugin in this sprint.
3. The audit should make new drift visible even before the repo is ready for strict failure.

### Verify Task 0.3

```bash
npm run spacing:audit
```

Expected result:

1. the repo has a repeatable report of current literal-spacing debt in governed surfaces
2. later sprints can tighten the rule without guessing the baseline

---

## Task 0.4 — Establish first-wave migration targets and exemptions

**What:** Freeze the exact set of Sprint 1 migration targets so the first implementation sprint stays narrow and does not sprawl into jobs, journal, and admin simultaneously.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/spacing_refactor/spec.md` only if first-wave scope needs sharper wording |
| **Modify** | this sprint doc |
| **Spec** | §7.2, §9 |

### Required Sprint 1 target set

Sprint 1 should be limited to shell and chat surfaces:

1. `src/components/SiteNav.tsx`
2. `src/components/AccountMenu.tsx`
3. `src/frameworks/ui/ChatHeader.tsx`
4. `src/frameworks/ui/ChatInput.tsx`
5. `src/frameworks/ui/ChatMessageViewport.tsx`
6. `src/frameworks/ui/MessageList.tsx`

### Required documented exemptions for Sprint 0

Document that these families remain out of migration scope for the next sprint until the authority layer is stable:

1. jobs cards and detail panels
2. journal and editorial layouts
3. admin forms and detail pages
4. profile settings panels
5. menus and support surfaces outside shell/chat

### Sprint 0 implementation closeout

Sprint 0 is complete when the repo reflects all of the following concrete outcomes:

1. `foundation.css` owns the modular ladder, semantic role tokens, and the shell/chat spacing consumers needed by current runtime surfaces
2. shell/chat targets no longer rely on undeclared half-step spacing tokens such as `--space-1.5`, `--space-0.5`, or `--space-3.5`
3. `npm run spacing:audit` reports only against the governed shell/chat-first scope while documented deferred families stay visible in the census
4. the census and spec both freeze Sprint 1 scope and the deferred families explicitly

### Verify Task 0.4

```bash
test -f docs/_refactor/spacing_refactor/spec.md
```

Expected result:

1. the first implementation sprint has a tight, defensible scope
2. later surface families are intentionally deferred rather than forgotten

---

## Task 0.5 — Add baseline verification for token presence and shell/chat continuity

**What:** Add or update a focused verification path that proves the new token layer exists and that shell/chat semantic hooks survive the baseline change.

| Item | Detail |
| --- | --- |
| **Modify** | targeted tests only if needed after token baseline changes |
| **Spec** | §8.1, §8.3 |

### Required verification intent

1. prove the new spacing tokens exist in the global style authority
2. prove existing shell and chat semantic classes or data hooks are still present after the baseline change
3. avoid broad snapshot testing; keep assertions focused on authority and surface continuity

### Suggested verification targets

1. `src/components/SiteNav.test.tsx`
2. `src/frameworks/ui/ChatInput.test.tsx`
3. `src/frameworks/ui/MessageList.test.tsx`

### Verify Task 0.5

```bash
npm exec vitest run src/components/SiteNav.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/MessageList.test.tsx
```

---

## Sprint 0 Verification Bundle

Run this bundle before marking the sprint complete:

```bash
npm run lint:css
npm run spacing:audit
npm exec vitest run src/components/SiteNav.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/MessageList.test.tsx
```

If Sprint 0 changes only global tokens and lightweight audits, a full build is optional here and becomes mandatory again in Sprint 1 when actual surface migration begins.

### Verified result

Verified on 2026-03-27:

1. `npm run lint:css` passed
2. `npm run spacing:audit` passed with `0` literal spacing matches in the governed Sprint 1 target set
3. `npm exec vitest run src/components/SiteNav.test.tsx src/frameworks/ui/ChatInput.test.tsx src/frameworks/ui/MessageList.test.tsx` passed with `33` tests green

---

## Completion Checklist

- [x] current spacing authority is documented concretely
- [x] modular ladder tokens exist in the global style authority
- [x] first semantic role-token families exist and respond to density state
- [x] a spacing audit command reports literal-spacing drift in governed surfaces
- [x] Sprint 1 shell/chat scope is frozen explicitly
- [x] shell and chat verification still pass after the baseline change

## Sprint 0 Exit Criteria

Sprint 0 is complete only when the repo has a trustworthy, implementation-ready answer to all of the following:

1. what the operational spacing ladder is
2. where spacing authority lives today
3. how semantic role tokens natively replace existing shell and chat spacing without CSS aliases
4. how literal-spacing drift will be detected before broad migration starts
5. which surfaces the first real implementation sprint will touch and which remain intentionally deferred

If any of those answers still depends on memory, tribal knowledge, or ad hoc code reading, Sprint 0 is not complete.

# Sprint 0 — Authority Baseline And Lint Guardrails

> **Goal:** Introduce CSS linting, document current style ownership, and create a safe baseline for the later file split.
> **Spec ref:** §1, §2, §3.1, §3.3, §4
> **Prerequisite:** None

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/globals.css` | single authored CSS entrypoint with tokens, utilities, shell, editorial, chat, and jobs styling mixed together |
| `package.json` | repo script authority for lint and quality workflows |
| `src/components/journal/JournalLayout.tsx` | shared editorial primitives already used to reduce component-level churn |
| `src/components/MarkdownProse.tsx` | journal prose renderer that now defers more styling to shared CSS |

---

## Task 0.1 — Add a CSS lint guardrail

**What:** Create a stylelint configuration that works with the repo's Tailwind v4-style directives and expose it through npm scripts.

| Item | Detail |
| --- | --- |
| **Create** | `stylelint.config.mjs` |
| **Modify** | `package.json` |
| **Spec** | Goal 4, §3.3, §4 |

### Implementation notes

1. Extend a standard stylelint baseline instead of inventing a custom rule set from scratch.
2. Ignore the Tailwind-specific at-rules already in use: `@custom-variant`, `@utility`, `@theme`, `@layer`, and `@apply`.
3. Add a dedicated `lint:css` script.
4. Wire the script into the existing quality path only if the repo stays green after the change.

### Verify Task 0.1

```bash
npm run lint:css
```

---

## Task 0.2 — Record the current authority map

**What:** Capture the current mixed ownership inside the spec and sprint docs so later extraction work is not driven by guesswork.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/style-system-authority-and-globals-partitioning/spec.md` |
| **Modify** | this sprint doc |
| **Spec** | §1, §3.1, §3.2 |

### Required inventory

1. root tokens and density variables
2. shell and navigation primitives
3. shared utility helpers
4. editorial and journal surfaces
5. chat and jobs surfaces
6. any feature-owned rules that still do not have a clean shared home

### Verify Task 0.2

```bash
test -f docs/_refactor/style-system-authority-and-globals-partitioning/spec.md
```

---

## Task 0.3 — Freeze safe removal criteria

**What:** Make dead-rule cleanup proof-driven before larger extraction work starts.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_refactor/style-system-authority-and-globals-partitioning/spec.md` |
| **Spec** | §3.4 |

### Verify Task 0.3

```bash
test -f docs/_refactor/style-system-authority-and-globals-partitioning/spec.md
```

---

## Completion Checklist

- [x] CSS lint guardrail exists and runs locally
- [x] The current style authority map is documented outside chat
- [x] Dead-rule cleanup criteria are explicit before larger partitioning starts
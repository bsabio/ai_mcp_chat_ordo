# Sprint 3 — Tool Surface Hygiene, Navigation, And Runtime Introspection

> **Goal:** Reduce model-facing tool ambiguity, clean up bundle drift, and give
> the system a truthful runtime-inspection path for self-descriptive answers.
> **Spec ref:** §3, §4, §5.1, §5.4, §9
> **Prerequisite:** Sprint 2

---

## Task 3.1 — Remove duplicate model-facing navigation

**What:** Keep one canonical navigation tool in the chat manifest and retire the
legacy duplicate from model-facing exposure.

Current target:

1. retain `navigate_to_page`
2. remove `navigate` from role manifests unless a compelling runtime-only use
   case remains

### Verify Task 3.1

```bash
node - <<'NODE'
const { getToolComposition } = require('./dist-not-built');
NODE
```

Verification note:
The exact inspection command can change, but the sprint must add a stable way
to assert role manifests do not expose both tools at once.

---

## Task 3.2 — Re-home tools into coherent bundles

**What:** Ensure calculator, navigation, chart, graph, audio, and admin tools
are registered from the correct bundle modules so maintenance and pruning stay
tractable.

### Verify Task 3.2

```bash
sed -n '1,220p' src/lib/chat/tool-bundles/calculator-tools.ts
sed -n '1,220p' src/lib/chat/tool-bundles/navigation-tools.ts
```

---

## Task 3.3 — Add an admin/runtime inspection tool

**What:** Provide a deliberate inspection surface for questions like “what tools
do you have” or “what manifest is active for this role” so the model does not
have to infer from prompt text.

### Verify Task 3.3

```bash
npm exec vitest run src/lib/chat/tool-composition-root.test.ts src/adapters/ChatPresenter.test.ts
```

---

## Task 3.4 — Snapshot role manifests

**What:** Add invariant or snapshot coverage for role-specific manifests so
tool-surface drift becomes visible in CI.

### Verify Task 3.4

```bash
npm exec vitest run tests/tool-registry.integration.test.ts
```

---

## Task 3.5 — Instrument before lane-aware manifest reduction

**What:** Add usage evidence before introducing lane/context-sensitive tool
manifests. If context-aware reduction is still needed after instrumentation,
gate it behind a feature flag and explicit acceptance tests.

### Verify Task 3.5

```bash
npm run admin:diagnostics
```

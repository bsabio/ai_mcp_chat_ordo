# Sprint 3 - Responsive Continuity And QA

> **Goal:** Finish the visual refinement with responsive continuity, footer harmony, and durable regression/QA evidence.
> **Spec sections:** `SLP-120` through `SLP-144`
> **Prerequisite:** Sprint 2 complete and committed

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/components/AppShell.tsx` | Home vs non-home main-shell composition and footer sibling structure |
| `src/components/SiteFooter.tsx` | Footer layout using `SHELL_FOOTER_GROUPS`, `ShellBrand`, and shell token roles |
| `src/frameworks/ui/ChatHeader.tsx` | Floating and embedded chat headers using shell role classes |
| `tests/shell-acceptance.test.tsx` | Canonical shell acceptance coverage |
| `tests/shell-visual-system.test.tsx` | Role-class visual regression coverage |
| `tests/browser-motion.test.tsx` | Motion/browser assertions that protect shell layering contracts |

---

## Tasks

### 1. Harmonize the footer with the refined shell language

Required work:

1. Adjust footer typography or spacing only where needed for continuity.
2. Preserve canonical footer route groups and brand reuse.
3. Do not introduce new IA or footer-only messaging concepts.

Verify:

```bash
npm run test -- tests/shell-acceptance.test.tsx tests/shell-visual-system.test.tsx
```

### 2. Validate responsive shell and homepage behavior across key breakpoints

Required work:

1. Ensure the header remains coherent at small desktop and tablet widths.
2. Ensure hero-state typography and chip clusters remain balanced on narrower widths.
3. Keep composer visibility and homepage-stage boundaries intact.

Verify:

```bash
npm run test -- tests/browser-motion.test.tsx tests/homepage-shell-layout.test.tsx tests/homepage-shell-ownership.test.tsx
```

### 3. Expand regression evidence where the new contract is most fragile

Required work:

1. Add or update assertions for hero-state attributes, shell role classes, and any critical non-wrapping expectations that are testable without brittle snapshots.
2. Avoid screenshot-style tests unless already established by the suite.

Verify:

```bash
npm run test -- src/frameworks/ui/MessageList.test.tsx tests/shell-acceptance.test.tsx tests/shell-visual-system.test.tsx
```

### 4. Final QA pass and documentation state update

Required work:

1. Update sprint checklists and note any QA deviations.
2. Run the full quality gate.
3. If the implementation fully lands, update spec/package status from draft accordingly.

Verify:

```bash
npm run quality
```

---

## Completion Checklist

- [ ] Footer remains visually continuous with refined shell language
- [ ] Responsive shell/homepage behavior validated
- [ ] Regression coverage updated for the new precision contract
- [ ] Full quality gate passes
- [ ] Sprint documentation updated with real verification state

## QA Deviations

None.
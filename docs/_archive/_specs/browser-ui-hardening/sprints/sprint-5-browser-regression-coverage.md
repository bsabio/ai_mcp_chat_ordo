# Sprint 5 - Browser Regression Coverage

> **Goal:** Add browser-focused regression coverage and explicit verification
> commands so future UI work cannot silently reintroduce the same issues.
> **Spec ref:** `BUI-100`, `BUI-170`, `BUI-250` through `BUI-255`, `BUI-265`
> **Prerequisite:** Sprint 4 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `package.json` | `lint`, `test`, `build`, `quality`, `lhci`, and `lhci:dev` already exist |
| `lighthouse-prod.json` | Existing performance baseline is recorded |
| `tests/` | Existing Vitest suite is already comprehensive in non-browser areas |
| `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md` | Created in Sprint 0 |
| `docs/_specs/browser-ui-hardening/artifacts/browser-ui-baseline.md` | Created in Sprint 0 |

---

## Task 5.1 - Add browser UI test suite entry points

**What:** Organize the new browser-related tests so they are easy to run and
 discover.

| Item | Detail |
| --- | --- |
| **Create** | `tests/browser-ui/README.md` |
| **Create or Modify** | Browser-focused test files from Sprints 2-4 |
| **Spec** | `BUI-250`, `BUI-251`, `BUI-265` |

### Task 5.1 Notes

Document which tests cover:

- shell/layout invariants
- overlays/popovers
- motion/reduced-motion
- browser API fallbacks

### Task 5.1 Verify

```bash
npm run test
```

---

## Task 5.2 - Add a browser verification command path

**What:** Add a repeatable command or npm script for browser UI verification.

| Item | Detail |
| --- | --- |
| **Modify** | `package.json` |
| **Spec** | `BUI-170`, `BUI-252`, `BUI-253`, `BUI-255` |

### Task 5.2 Notes

Use existing tools where possible. The simplest acceptable outcome is a named
 script that runs the browser-focused tests and points to Lighthouse validation.
 If browser automation is introduced, keep its scope small and documented.

### Task 5.2 Verify

```bash
npm run lint -- package.json
```

---

## Task 5.3 - Re-baseline Lighthouse and runtime checks

**What:** Compare the new shell against the existing baseline and record any
 regressions or improvements.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/browser-ui-hardening/artifacts/browser-ui-baseline.md` |
| **Optional Modify** | `lighthouse-prod.json` if a fresh canonical run is captured |
| **Spec** | `BUI-253`, `BUI-265` |

### Task 5.3 Notes

Record user-visible changes, not just scores. Pay attention to layout stability,
 input usability, and overlay behavior.

### Task 5.3 Verify

```bash
npm run build
```

---

## Task 5.4 - Write browser acceptance evidence checklist

**What:** Expand the verification matrix into a sprint-complete evidence list.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md` |
| **Spec** | `BUI-240` through `BUI-255`, `BUI-265` |

### Task 5.4 Notes

Each browser class should have explicit pass criteria for:

- shell rendering
- floating chat open/close
- command palette usability
- mentions and account menu behavior
- audio playback/manual play path
- reduced-motion behavior

### Task 5.4 Verify

```bash
npm run quality
```

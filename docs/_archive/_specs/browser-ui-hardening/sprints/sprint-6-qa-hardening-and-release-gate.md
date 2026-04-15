# Sprint 6 - QA Hardening And Release Gate

> **Goal:** Perform final QA against the browser-ui-hardening spec, confirm the
> acceptance matrix, and define the release gate for browser readiness.
> **Spec ref:** `BUI-240` through `BUI-265`
> **Prerequisite:** Sprint 5 complete

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `docs/_specs/browser-ui-hardening/spec.md` | Source of truth for browser hardening requirements |
| `docs/_specs/browser-ui-hardening/sprints/` | Full sprint implementation blueprint |
| `docs/_specs/browser-ui-hardening/artifacts/browser-ui-verification-matrix.md` | Browser pass/fail checklist |
| `docs/_specs/browser-ui-hardening/artifacts/browser-ui-baseline.md` | Baseline and post-change evidence log |
| `package.json` | Final verification commands already available |

---

## Task 6.1 - QA the implementation against the spec

**What:** Review every changed file from Sprints 0-5 against the spec and sprint
 docs.

| Item | Detail |
| --- | --- |
| **Audit** | All changed shell, overlay, motion, media, test, and doc files |
| **Spec** | All `BUI-*` requirements |

### QA checklist

Confirm at minimum:

- viewport and safe-area behavior are no longer brittle by construction
- dialogs and popovers no longer depend on transform-centering correctness
- reduced-motion rules are active and observable
- blur/view transitions are additive, not structural
- browser-sensitive APIs are helper-guarded or explicitly documented
- regression tests cover the intended browser risk classes

### Task 6.3 Verify

```bash
npm run test
```

---

## Task 6.2 - Run the full release gate

**What:** Execute the final project-level verification and record outcomes.

| Item | Detail |
| --- | --- |
| **Verify** | Full lint, tests, build, and browser verification path |
| **Spec** | `BUI-252` through `BUI-255`, `BUI-265` |

### Commands

```bash
npm run lint
npm run test
npm run build
npm run quality
```

If Sprint 5 introduced an explicit browser verification command, run it here as
 part of the release gate as well.

---

## Task 6.3 - Record final acceptance report

**What:** Produce a short QA acceptance report that states which browsers and
 scenarios were verified and whether any residual risks remain.

| Item | Detail |
| --- | --- |
| **Create** | `docs/_specs/browser-ui-hardening/artifacts/browser-ui-release-gate.md` |
| **Spec** | `BUI-240` through `BUI-265` |

### Implementation notes

The final report should be concise and release-facing:

- verified browsers
- scenarios checked
- outstanding non-blocking caveats
- final pass/fail verdict

### Verify

```bash
npm run build
```

# Sprint 2 — Backfill And QA

> **Goal:** Provide a repair path for stale data and lock behavior down with
> regression checks.
> **Spec ref:** §3.3, §4, §6
> **Prerequisite:** Sprint 1 complete

---

## Task 2.1 — Add a backfill or repair command

**What:** Create a script or admin-only maintenance helper that scans canonical
conversation ownership and repairs stale conversation embeddings.

| Item | Detail |
| --- | --- |
| **Create** | script under `scripts/` or internal maintenance helper |
| **Spec** | Goal 3 |

### Verify Task 2.1

```bash
npm run typecheck
```

---

## Task 2.2 — Add operational notes

**What:** Document when to run the repair path and how to verify migrated
conversations are searchable.

| Item | Detail |
| --- | --- |
| **Modify** | `README.md` or `operations/` docs if the script becomes operator-facing |
| **Spec** | Done Criteria 3 |

### Verify Task 2.2

```bash
rg "conversation" operations README.md scripts -n
```

---

## Task 2.3 — Final regression suite

**What:** Ensure SQL ownership, vector ownership, and search visibility remain
aligned.

### Verify Task 2.3

```bash
npx vitest run
npm run build
```

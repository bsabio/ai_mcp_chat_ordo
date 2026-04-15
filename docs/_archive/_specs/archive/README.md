# Spec Archive

This directory preserves superseded feature specs and planning docs that are no longer part of the active product contract.

Archiving is for clarity, not erasure.

Use this directory when a feature family:

1. is historically important,
2. still explains shipped code or past decision-making,
3. but no longer represents current product truth under [Platform V1](../platform-v1/spec.md).

---

## 1. Archive Rules

1. Never delete historical specs solely because they are superseded.
2. Move a feature family here only after its replacement or governing contract is explicit.
3. Every archived feature folder must include an archive note.
4. Archived folders must be removed from the active feature table in [docs/_specs/README.md](../README.md).
5. Archive notes must preserve what implementation or design value is still worth consulting.

---

## 2. Recommended Structure

```text
docs/_specs/archive/
├── README.md
├── archive-note-template.md
├── implementation-plan.md
├── tool-architecture-plan.md
└── 2026-platform-v1-superseded/
    ├── dashboard-ai-action-workspace/
    ├── dashboard-rbac-blocks/
    └── swiss-layout-precision/
```

The dated grouping keeps superseded families together by cleanup wave while preserving the original feature folder names inside each batch.

---

## 3. Minimum Archive Checklist

Before moving a feature folder into archive, confirm all of the following:

- [ ] The feature has been classified as `archive-ready` in the active-spec inventory.
- [ ] The authoritative replacement or governing contract is identified.
- [ ] Any implementation details still needed by active work are referenced in the archive note.
- [ ] The feature is removed from the active feature table.
- [ ] The archive note is added inside the archived feature folder.

---

## 4. Executed Archive Batch

Based on [the initial archive shortlist](../platform-convergence-and-spec-rationalization/artifacts/initial-archive-shortlist.md), the first executed archive wave is:

1. `dashboard-ai-action-workspace`
2. `dashboard-rbac-blocks`
3. `swiss-layout-precision`
4. `theme-consistency`

These folders now live under `docs/_specs/archive/2026-platform-v1-superseded/`.

# Archive Note Template

Use this note inside any feature folder moved under `docs/_specs/archive/`.

---

## Archive Summary

- **Original feature:** `feature-name`
- **Archive date:** `YYYY-MM-DD`
- **Archive batch:** `2026-platform-v1-superseded`
- **Reason archived:** Short explanation of why the feature is no longer current.
- **Replacement or governing contract:** Link to the authoritative or supporting spec that now owns the capability.

## Historical Value Retained

List the parts still worth consulting.

1. Runtime or UI behaviors that still exist in code.
2. Data model or implementation ideas that were preserved.
3. Test assets or evaluation patterns that remain useful.

## Preservation Notes

Record anything that must not be lost during archive.

1. Backend helpers or loaders to repurpose.
2. Naming or migration notes needed by active implementation work.
3. Follow-up work needed before code deletion.

## Supersession Statement

State clearly how this feature was superseded.

Example:

`Platform V1 retired dashboard-first operation as a first-class product modality. This spec remains archived for provenance, while active product behavior is now governed by Platform V1 and Platform Convergence And Spec Rationalization.`

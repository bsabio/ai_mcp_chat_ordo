# Sprint 0 — Active Spec Inventory And Archive Shortlist

> **Parent spec:** [Platform Convergence And Spec Rationalization](../spec.md)
> **Requirement IDs:** `PCR-020` through `PCR-028`, `PCR-052` through `PCR-075`
> **Goal:** Inventory the current spec corpus, classify active versus legacy documents, define the first archive-ready shortlist, and establish the concrete repository artifacts needed for spec cleanup without deleting historical context.

---

## 1. Current State

The repository already has a large and mature spec corpus, but the active-spec boundary is still informal. `docs/_specs/README.md` mixes complete, in-progress, and draft features from multiple product eras, while Platform V1 has become the primary product contract.

Verified current conditions:

1. [docs/_specs/README.md](../../README.md) is the active index for the spec corpus.
2. [docs/_specs/platform-v1/spec.md](../../platform-v1/spec.md) is the authoritative product direction for the current refactor.
3. `docs/_specs/archive/` exists but is currently sparse and does not yet hold the superseded feature families that Platform V1 has replaced.
4. The repository still contains detailed feature families for dashboard-first and pre-V1 shell/layout directions that may now be legacy or archive-ready.

---

## 2. Sprint Output

This sprint produces four durable outputs:

1. an active-spec inventory with per-feature classification
2. an initial archive shortlist with rationale and risk notes
3. an archive structure proposal for `docs/_specs/archive/`
4. updated planning guidance describing how Platform V1 governs which specs remain active

This sprint is inventory and planning only. It does not yet move folders into archive or delete implementation code.

---

## 3. Tasks

### Task 0.1 — Build the active spec inventory

Create a written inventory of the current spec corpus with one of four labels per feature:

1. `authoritative`
2. `supporting`
3. `legacy`
4. `archive-ready`

Minimum inventory fields:

| Field | Meaning |
| --- | --- |
| Feature | Spec folder name |
| Status | One of the four labels above |
| Rationale | Why it is active, supporting, legacy, or archive-ready |
| Successor / Authority | Platform V1 or another current spec that governs it |
| Code dependency note | Whether shipped code still depends on the concepts or artifacts |

Rules:

1. `platform-v1` is the only top-level `authoritative` product contract.
2. A feature can remain `supporting` only if it still provides necessary architecture or implementation detail for the V1 product.
3. `legacy` means historically important but not current.
4. `archive-ready` means it is already superseded enough that the next sprint can move it under `docs/_specs/archive/` once archive notes are written.

Verify:

```bash
npx markdownlint-cli2 docs/_specs/platform-convergence-and-spec-rationalization/**/*.md
```

### Task 0.2 — Create the first archive shortlist

Create the first archive shortlist artifact for the feature families most likely to move out of the active index.

At minimum, the shortlist must identify:

1. clearly superseded dashboard-first feature families
2. shell or visual feature families whose main purpose was tied to pre-V1 modality work
3. any route- or IA-specific specs that are now better expressed through Platform V1 and its supporting specs

Each shortlist entry must include:

1. candidate feature folder
2. archive confidence: `high`, `medium`, or `needs review`
3. why it should be archived or reviewed
4. which active contract supersedes it
5. what must be preserved before archiving it, if anything

Verify:

```bash
npx markdownlint-cli2 docs/_specs/platform-convergence-and-spec-rationalization/**/*.md
```

### Task 0.3 — Define the archive structure and note format

Specify the archive folder layout and the required contents of each archive note.

The archive note format must minimally include:

1. original feature name
2. archive date
3. reason archived
4. replacement or authoritative contract
5. historical value retained

The result should be concrete enough that Sprint 3 can move folders into archive without inventing a new process.

Verify:

```bash
npx markdownlint-cli2 docs/_specs/platform-convergence-and-spec-rationalization/**/*.md
```

### Task 0.4 — Record the scope boundary for cleanup work

Make the planning boundary explicit so future implementation sprints do not confuse doc cleanup with arbitrary architectural rewriting.

This sprint must clearly state:

1. documentation cleanup does not automatically justify runtime rewrites
2. strategic inherited capabilities such as the books/corpus/librarian knowledge substrate are preserved
3. dashboard UI modality may be retired without discarding dashboard-derived query logic and data loaders
4. the purpose of archiving is clarity, not erasure

Verify:

```bash
npx markdownlint-cli2 docs/_specs/platform-convergence-and-spec-rationalization/**/*.md
```

---

## 4. Completion Checklist

- [x] Active spec inventory exists with authoritative/supporting/legacy/archive-ready classifications
- [x] First archive shortlist exists with rationale and confidence levels
- [x] Archive structure and archive note format are documented
- [x] Cleanup scope boundaries are explicit and protect the content/knowledge substrate
- [x] All sprint docs created in this feature folder pass markdown validation

---

## 5. QA Deviations

None yet.

# Journal Editorial Operations — Sprint Plan

> **Status:** Ready for implementation
> **Spec:** [Journal Editorial Operations](../spec.md)

## Sprint Sequence

Sprint 0 -> Sprint 1 -> TD-A -> Sprint 2 -> Sprint 2B -> Sprint 3 -> TD-C -> TD-D

| Sprint | Focus |
| --- | --- |
| [Sprint 0](sprint-0-editorial-domain-and-revisions.md) | Expand the content model with explicit editorial metadata, workflow states, revision persistence, and the canonical service seams that power journal workers |
| [Sprint 1](sprint-1-admin-journal-workspace.md) | Add `/admin/journal` support surfaces, canonical read models, and preview-route convergence without drifting into page-only logic |
| [TD-A](td-a-booch-object-audit.md) | Audit object boundaries, repository cohesion, admin read models, and compatibility-surface discipline before route cutover |
| [Sprint 2](sprint-2-workflow-actions-and-editorial-history.md) | Add moderation actions, revision restore, and journal-first admin/tool language across the shipped support surfaces |
| [Sprint 2B](sprint-2b-journal-worker-wrapper-registration.md) | Register the remaining journal-named worker wrappers in the canonical tool registry and verify role exposure, compatibility, and registry truthfulness |
| [Sprint 3](sprint-3-public-journal-route-convergence.md) | Add canonical `/journal` routes, redirect `/blog`, and update navigation, canonicals, chat summaries, and compatibility behavior |
| [TD-C](td-c-martin-solid-audit.md) | Audit SOLID and Clean Architecture boundaries across interactors, repositories, admin APIs, and route handlers |
| [TD-D](td-d-gof-pattern-compliance-audit.md) | Audit Facade, Repository, Data Mapper, Composition Root, and compatibility-pattern correctness |

## Notes

- This package intentionally does not start with a full `Blog*` symbol rename.
- Public route convergence is sequenced after editorial operations so the system has a stable management model before URLs change.
- Existing heuristic taxonomy remains available only as fallback behavior for legacy rows until explicit metadata is backfilled.
- Existing admin blog APIs for hero images and artifacts are part of the implementation foundation and should be extended or wrapped, not bypassed.
- Remaining journal-named worker targets are intentionally sequenced into Sprint 2B so the registry transition is explicit, testable, and grounded in the already-shipped editorial seams.
- Route convergence is not complete until public pages, shell tone, sitemap, chat presenter, jobs, evals, and preview links all emit coherent `/journal` truth.
- No sprint is complete if it improves a page while leaving the corresponding worker or service seam ambiguous. Chat remains the primary control surface; pages remain support surfaces.

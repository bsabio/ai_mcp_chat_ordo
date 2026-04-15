# Blog Article Production Pipeline — Sprint Plan

> **Status:** Active sprint map
> **Spec:** [Blog Article Production Pipeline](../spec.md)

## Sprint Sequence

Sprint 0 -> Sprint 1 -> Sprint 2 -> Sprint 3 -> Sprint 4 -> Sprint 5 -> Sprint 6 -> Sprint 7

## Focus

| Sprint | Focus |
| --- | --- |
| Sprint 0 | [Asset model, blog asset persistence, and public delivery](./sprint-0-asset-model-and-public-delivery.md) |
| Sprint 1 | [Native image-generation service and discrete image tools](./sprint-1-native-image-generation.md) |
| Sprint 2 | [Article QA and QA-resolution stage tools](./sprint-2-article-qa-stages.md) |
| Sprint 3 | [Deterministic article orchestration through deferred jobs](./sprint-3-article-orchestration-tool.md) |
| Sprint 4 | [Blog rendering, metadata, retries, and hardening](./sprint-4-blog-rendering-and-hardening.md) |
| Sprint 5 | [Editorial image variations and hero selection](./sprint-5-editorial-image-variations-and-selection.md) |
| Sprint 6 | [Deferred job clarity, completion delivery, and blog operator UX](./sprint-6-deferred-job-clarity-and-blog-operator-ux.md) |
| Sprint 7 | [Deferred job runtime reliability and human-readable operator progress](./sprint-7-deferred-job-runtime-reliability-and-human-readable-operator-progress.md) |

## Sprint Status

| Sprint | Status | Notes |
| --- | --- | --- |
| Sprint 0 | Accepted | Asset model and public delivery baseline is in place. |
| Sprint 1 | Accepted | Native image generation and discrete image tools are in place. |
| Sprint 2 | Accepted | Article QA and QA-resolution stages are in place. |
| Sprint 3 | Accepted | Deferred orchestration baseline is in place. |
| Sprint 4 | Accepted | Public rendering, metadata, retries, and hardening are in place. |
| Sprint 5 | Accepted | Editorial image variation and hero-selection workflow is in place. |
| Sprint 6 | Accepted with carry-forward | Status reads, recovery, publish handoff, evals, and QA wrapper are implemented; remaining runtime and operator-experience issues carry into Sprint 7. |
| Sprint 7 | Planned | Owns always-on worker reliability, human-readable job identity, richer progress, and active-work operator UX. |

## Notes

- This spec starts with blog hero-image generation as the first implementation priority.
- `draft_content` and `publish_content` remain valid low-level blog tools and are not replaced by this spec.
- The long-term goal is a fully native article-production system assembled from discrete MCP tools and internal services.
- Sprint 5 is a follow-on extension beyond the original Sprint 0-4 plan and focuses on editorial candidate-image selection rather than broadening the public journal surface.
- Sprint 6 is a follow-on reliability sprint focused on deferred-job status visibility, deterministic completion surfacing, and publish-ready blog job actions.
- Sprint 7 is the next active follow-on sprint and owns the remaining always-on runtime reliability and human-readable deferred-job operator UX work.

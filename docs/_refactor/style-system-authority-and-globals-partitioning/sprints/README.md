# Implementation Plan — Style System Authority And Globals Partitioning

> **Status:** Ready for implementation
> **Source:** `docs/_refactor/style-system-authority-and-globals-partitioning/spec.md`

## Sprint Files

| Sprint | File | Description |
| --- | --- | --- |
| 0 | [sprint-0-authority-baseline-and-lint-guardrails.md](sprint-0-authority-baseline-and-lint-guardrails.md) | Add CSS linting and lock the current ownership map |
| 1 | [sprint-1-foundations-and-shell-partition.md](sprint-1-foundations-and-shell-partition.md) | Separate tokens, shell primitives, and shared utilities |
| 2 | [sprint-2-editorial-and-prose-consolidation.md](sprint-2-editorial-and-prose-consolidation.md) | Finish editorial and journal authority cleanup |
| 3 | [sprint-3-chat-jobs-and-dead-rule-closeout.md](sprint-3-chat-jobs-and-dead-rule-closeout.md) | Partition remaining surfaces and close the refactor with QA |

## Dependency Graph

```text
Sprint 0 (baseline + lint)
  └──→ Sprint 1 (foundations + shell)
         └──→ Sprint 2 (editorial + prose)
                └──→ Sprint 3 (chat/jobs + closeout)
```
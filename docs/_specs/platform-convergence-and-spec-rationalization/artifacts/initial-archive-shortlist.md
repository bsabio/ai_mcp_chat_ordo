# Initial Archive Shortlist

> **Feature:** [Platform Convergence And Spec Rationalization](../spec.md)
> **Date:** 2026-03-23
> **Purpose:** First-pass candidate list of feature families likely to move from the active spec index into `docs/_specs/archive/` once archive notes and dependency checks are complete.
> **Execution update:** `dashboard-ai-action-workspace`, `dashboard-rbac-blocks`, and `swiss-layout-precision` were archived under `docs/_specs/archive/2026-platform-v1-superseded/` on 2026-03-23. `theme-consistency` was archived in the same batch to restore `_specs` structure discipline.

This remains a shortlist artifact rather than the canonical archive log. `needs review` candidates still require confirmation that no active Platform V1 work depends on them as current planning contracts.

## Candidate Table

| Feature folder | Confidence | Recommended status | Why | Active successor or governing contract | Preserve before archive |
| --- | --- | --- | --- | --- | --- |
| `dashboard-ai-action-workspace` | high | archive-ready | Platform V1 explicitly supersedes dashboard-first operator modality in favor of chat-first tools. | [Platform V1](../../platform-v1/spec.md) | Preserve any handoff, admin-tool, or query concepts that still matter in chat-first form. |
| `dashboard-rbac-blocks` | high | archive-ready | V1 eliminates the dashboard page and rehomes those capabilities behind chat tools. | [Platform V1](../../platform-v1/spec.md) | Preserve data-loader and visibility logic that can back admin MCP tools. |
| `swiss-layout-precision` | medium | archive-ready | Much of its value was tied to dashboard/homepage presentation refinement before the stronger V1 product simplification. | [Platform V1](../../platform-v1/spec.md) | Preserve any typography/token decisions still reflected in shipped UI code. |
| `floating-chat-visual-authority` | medium | needs review | Valuable as historical UI rationale, but parts may still support shipped floating chat polish. | [Platform V1](../../platform-v1/spec.md), [Chat Experience](../../chat-experience/spec.md) | Confirm whether active UI work still depends on it as a current contract. |
| `fab-shell-refactor` | medium | needs review | Some of its architectural rationale may already be absorbed by the unified chat surface direction. | [Platform V1](../../platform-v1/spec.md), V0 delivered architecture referenced from Platform V1 | Preserve any remaining floating-mode constraints still represented in shipped code. |
| `footer-information-architecture` | medium | needs review | V1 still needs sparse shell IA, but the current feature may need to be absorbed into the platform shell/content model rather than remain standalone. | [Platform V1](../../platform-v1/spec.md) | Preserve route-purpose and footer-grouping rules if still active. |
| `homepage-chat-shell` | low | supporting for now | Still directly related to the chat-first landing experience and likely remains part of active V1 implementation. | [Platform V1](../../platform-v1/spec.md) | Keep active until the V1 homepage/front-door work is fully reconciled. |
| `chat-experience` | low | supporting for now | Still central to the product and clearly compatible with a chat-first platform. | [Platform V1](../../platform-v1/spec.md) | Keep active. |
| `librarian` | low | supporting for now | Core to the knowledge substrate and explicitly preserved by the convergence discussion. | [Platform V1](../../platform-v1/spec.md), [Platform Convergence](../spec.md) | Keep active. |

## Notes

### High-confidence archive candidates

These were the first archive moves completed in the 2026-03-23 batch:

1. `dashboard-ai-action-workspace`
2. `dashboard-rbac-blocks`

Both are directly at odds with Platform V1's explicit dashboard elimination and chat-first tool model.

### Medium-confidence candidates

These feature families may still belong in a later archive wave, but the repo should confirm whether they are still needed as active planning references for shipped UI behavior or incomplete cleanup work:

1. `floating-chat-visual-authority`
2. `fab-shell-refactor`
3. `footer-information-architecture`

### Explicitly preserved feature families

These should remain active unless later V1 work replaces them with a clearer supporting contract:

1. `librarian`
2. `chat-experience`
3. `homepage-chat-shell`

The key rule is that content/knowledge substrate and chat-first runtime behavior are strategic platform assets, not legacy IA.

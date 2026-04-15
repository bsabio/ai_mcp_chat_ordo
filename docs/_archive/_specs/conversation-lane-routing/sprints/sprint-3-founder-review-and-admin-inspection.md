# Sprint 3 - Founder Review And Admin Inspection

> **Goal:** Add founder-facing review surfaces for recently changed, uncertain, and high-priority routed conversations so routing becomes operationally actionable instead of remaining summary-only analytics.
> **Spec ref:** `CLR-033`, `CLR-035`, `CLR-071`, `CLR-082`, `CLR-084`
> **Prerequisite:** Sprint 2 complete
> **Test count target:** 634 existing + 7 new = 641 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `mcp/analytics-tool.ts` | Sprint 2 already exposes lane distribution, uncertain counts, and lane-change event totals, but not a founder-usable queue of specific conversations |
| `tests/conversation-analytics.test.ts` | Existing tests already seed `lane_changed` and `lane_uncertain` events, which can be extended to cover recently changed or uncertain review lists |
| `src/app/api/conversations/active/route.ts` | Active-conversation APIs already expose conversation routing state and can inform any later founder/admin route shape |
| `src/core/use-cases/ConversationInteractor.ts` | Routing updates already emit canonical `lane_analyzed`, `lane_changed`, and `lane_uncertain` events suitable for review queues |
| `src/lib/chat/routing-consumers.ts` | Shared helper logic now exists for downstream lane-aware behavior, so Sprint 3 can focus on founder review rather than client classification logic |

---

## Task 3.1 - Add founder-facing routing review output

**What:** Extend founder-visible analytics or inspection output with concrete lists of conversations that need review, not just aggregate counts.

| Item | Detail |
| --- | --- |
| **Modify** | `mcp/analytics-tool.ts` |
| **Modify** | `tests/conversation-analytics.test.ts` |
| **Spec** | `CLR-033`, `CLR-035`, `CLR-071`, `CLR-082` |

### Task 3.1 Notes

Useful additions include:

1. recently changed conversations with `from_lane`, `to_lane`, and timestamps
2. currently uncertain conversations ordered by most recent analysis
3. high-confidence organizational and individual conversations ready for follow-up

If a new metric is introduced, prefer a narrow shape such as `routing_review` rather than bloating unrelated analytics outputs.

### Task 3.1 Verify

```bash
npx vitest run tests/conversation-analytics.test.ts
```

---

## Task 3.2 - Add an explicit admin inspection boundary

**What:** Create a dedicated founder/admin inspection surface if analytics output alone is insufficient for operational review.

| Item | Detail |
| --- | --- |
| **Create or Modify** | `src/app/api/admin/...` or a founder-only route/tool surface |
| **Modify** | supporting tests near the chosen route/tool |
| **Spec** | `CLR-033`, `CLR-071`, `CLR-084` |

### Task 3.2 Notes

This sprint should answer whether founder review can stay analytics-only or needs a dedicated route/tool for:

1. uncertain conversations awaiting manual review
2. conversations with recent lane changes
3. conversations ready for contact capture or follow-up

Keep lane mutation server-owned even if inspection expands.

### Task 3.2 Verify

```bash
npm run typecheck
```

---

## Task 3.3 - Record founder-review boundary decisions

**What:** Preserve the review-surface choice so later admin tooling and override work stay aligned.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/conversation-lane-routing/sprints/sprint-3-founder-review-and-admin-inspection.md` |
| **Spec** | `CLR-035`, `CLR-071` |

### Task 3.3 Notes

Document any of the following if they shift during implementation:

1. whether founder review stays inside analytics output or moves to a dedicated route/tool
2. whether manual override remains out of scope after Sprint 3
3. what queue ordering is most useful: recent changes, uncertain first, or follow-up priority

### Task 3.3 Verify

```bash
npm run typecheck
```

---

## Completion Checklist

- [x] Founder-facing routing review surfaces include concrete conversation lists, not only aggregate counts
- [x] Recently changed and uncertain conversations are queryable without transcript replay
- [x] Any admin inspection path remains read-only unless override work is explicitly added later

## QA Deviations

- Founder review now ships in two read-only surfaces: `conversation_analytics(metric: \"routing_review\")` for MCP analytics usage and `GET /api/admin/routing-review` for in-app admin inspection.
- Manual routing override remains out of scope for Sprint 3. This sprint exposes queues for uncertain conversations, recent lane changes, and follow-up-ready conversations only.
- Queue ordering favors operational recency: recent `lane_changed` events first, then conversations ordered by `lane_last_analyzed_at` with `updated_at` as fallback.

# Sprint 4 — Conversation Analytics

**Goal:** Administrators have full visibility into conversation patterns,
conversion funnels, and engagement metrics via MCP tools. Data-driven
optimization of the anonymous→authenticated conversion path.

### Pre-existing infrastructure (from earlier sprints)

The following are already in place and should be reused, not re-created:

- **MCP server pattern** — `mcp/embedding-server.ts` has 17 tools
  (6 embedding + 6 librarian + 5 prompt). Uses `AllDeps` interface with
  typed dependency families, `buildDeps()` with `getDb()` singleton,
  `ListToolsRequestSchema`/`CallToolRequestSchema` switch dispatch.
  Analytics tools follow the same pattern: add `analytics: AnalyticsToolDeps`
  to `AllDeps`, wire in `buildDeps()`.
- **`conversation_events` table** — schema in `src/lib/db/schema.ts`
  (Sprint 0). Has columns: `id`, `conversation_id`, `event_type`,
  `metadata` (JSON), `created_at`. Indexed on `conversation_id`,
  `event_type`, and `created_at`. 6 event types currently emitted:
  `started`, `archived`, `message_sent`, `tool_used`, `converted`,
  `prompt_version_changed`.
- **`conversations` table** — 11 columns: `id`, `user_id`, `title`,
  `created_at`, `updated_at`, `status` (`active`/`archived`),
  `converted_from`, `message_count`, `first_message_at`,
  `last_tool_used`, `session_source`, `prompt_version`. Anonymous users
  have `user_id LIKE 'anon_%'`.
- **`messages` table** — `id`, `conversation_id`, `role`, `content`,
  `parts` (JSON with `tool_call`/`tool_result`/`text`/`summary` types),
  `created_at`, `token_estimate`.
- **`ConversationDataMapper`** — `src/adapters/ConversationDataMapper.ts`
  (Sprint 0). 12 methods including `listByUser()`, `findActiveByUser()`,
  `findById()`. Provides `ConversationRow` and `mapRow()`.
- **`ConversationEventRecorder`** — `src/core/use-cases/ConversationEventRecorder.ts`
  (Sprint 0). Used by `ConversationInteractor` and `prompt-tool.ts`.
- **Tool usage tracking** — `tool_used` events recorded via
  `ConversationInteractor.recordToolUsed()` with `{ tool_name }` metadata.
  The `last_tool_used` column on conversations tracks the most recent tool.
- **Existing tests** — 424 tests across 71 files (Sprints 0–3). Build
  and lint are clean.

| Task | Description | Req |
|------|-------------|-----|
| 4.1 | Create `mcp/analytics-tool.ts` with `AnalyticsToolDeps` interface (`{ db: Database.Database }`) | CONVO-070 |
| 4.2 | Implement `conversation_analytics` handler (overview, funnel, engagement, tool_usage, drop_off metrics; §14.2) | CONVO-070 |
| 4.3 | Implement `conversation_inspect` handler (conversation deep-dive with message previews + events timeline; §14.2) | CONVO-070 |
| 4.4 | Implement `conversation_cohort` handler (anonymous/authenticated/converted comparison with mean, median, stddev, p95, low_sample_warning; §14.2) | CONVO-070 |
| 4.5 | Register all 3 analytics tools in `mcp/embedding-server.ts`: add `analytics` deps to `AllDeps` + `buildDeps()`, tool schemas in `ListTools`, dispatch cases in `CallTool` | CONVO-070 |
| 4.6 | Verify event emission coverage: confirm all 6 event types (`started`, `archived`, `message_sent`, `tool_used`, `converted`, `prompt_version_changed`) are emitted in the correct places; verify `session_source` is set on conversation creation | CONVO-070 |
| 4.7 | Unit + integration tests (~5 new per §15.1: overview aggregates, funnel stages, engagement metrics, tool_usage counts, cohort comparison; + 1 integration per §15.2) | |
| 4.8 | Full suite green, build clean | |

**Deliverable: ~424 existing + ~6 new = ~430 tests, full analytics
dashboard via MCP tools.**

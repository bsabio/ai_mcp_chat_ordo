# Sprint 3 — System Prompt Management

**Goal:** Administrators can view, edit, version, and roll back system
prompts for any role via MCP tools. No code deployment required to tune
the anonymous user experience.

## Pre-existing infrastructure (from earlier sprints)

The following are already in place and should be reused, not re-created:

- **`ChatPolicyInteractor`** — `src/core/use-cases/ChatPolicyInteractor.ts`
  (Sprint 0). Constructor takes a `basePrompt: string`; `execute({ role })`
  concatenates it with `ROLE_DIRECTIVES[role]`. Task 3.6a refactors the
  constructor to accept a `SystemPromptRepository` instead.
- **`ROLE_DIRECTIVES`** — module-level constant in `ChatPolicyInteractor.ts`
  with entries for ANONYMOUS, AUTHENTICATED, STAFF, ADMIN. Sprints 1–2
  added `search_my_conversations` directives to AUTHENTICATED/STAFF/ADMIN.
  These become the seed content for `prompt_type = 'role_directive'` rows.
- **`BASE_PROMPT`** — module-level constant in `src/lib/chat/policy.ts`
  (~40 lines, "Product Development Advisor" persona). Becomes the seed
  for `role = 'ALL'`, `prompt_type = 'base'`.
- **`buildSystemPrompt(role)`** — in `policy.ts`. Currently wraps
  `ChatPolicyInteractor(BASE_PROMPT)` in a `LoggingDecorator`. Task 3.7
  replaces the hardcoded prompt with a DB-backed repository.
- **`LoggingDecorator`** — `src/core/common/LoggingDecorator.ts`. Generic
  `UseCase<TReq, TRes>` wrapper with timing + error logging. Already
  wrapping `ChatPolicyInteractor`; no changes needed.
- **`ConversationEventRecorder`** — `src/core/use-cases/ConversationEventRecorder.ts`
  (Sprint 0). Records events to `conversation_events` table.
  Task 3.10/3.11 emit `prompt_version_changed` events via this recorder.
- **`conversation_events` table** — schema exists in `src/lib/db/schema.ts`
  (Sprint 0). Supports `event_type = 'prompt_version_changed'` without
  DDL changes (§12.3).
- **MCP server pattern** — `mcp/embedding-server.ts` has 12 tools
  (embedding + librarian). Uses `@modelcontextprotocol/sdk`,
  `StdioServerTransport`, switch-based dispatch. New prompt tools follow
  the same pattern.
- **Existing tests** — `tests/core-policy.test.ts` (ChatPolicyInteractor
  RBAC + role framing, 10 tests) and `tests/chat-policy.test.ts`
  (`buildSystemPrompt`, `looksLikeMath`, `getModelCandidates`, 6 tests).
  Some tests will need updated assertions after the refactor.

| Task | Description | Req |
| ---- | ----------- | --- |
| 3.1 | Schema migration: `system_prompts` table + unique partial index on `(role, prompt_type) WHERE is_active = 1` | CONVO-060 |
| 3.2 | Seed migration: insert current hardcoded `BASE_PROMPT` as version 1 (`role = 'ALL'`, `prompt_type = 'base'`) | CONVO-060 |
| 3.3 | Seed migration: insert each `ROLE_DIRECTIVES[role]` as version 1 (`prompt_type = 'role_directive'`) | CONVO-060 |
| 3.4 | Define `SystemPromptRepository` port (§13.3) | CONVO-060 |
| 3.5 | Implement `SystemPromptDataMapper` adapter (§13.4) | CONVO-060 |
| 3.6 | Create `DefaultingSystemPromptRepository` decorator (Null Object pattern — `getActive()` never returns null; §13.5) | CONVO-060 |
| 3.6a | Refactor `ChatPolicyInteractor`: constructor takes `SystemPromptRepository`; `execute()` calls `getActive()` twice (base + directive); update existing tests | CONVO-060 |
| 3.7 | Update `buildSystemPrompt()` in `policy.ts`: wire `SystemPromptDataMapper` → `DefaultingSystemPromptRepository` → `ChatPolicyInteractor` (§13.6) | CONVO-060 |
| 3.8 | Implement `prompt_list` MCP tool in `mcp/embedding-server.ts` (§13.7) | CONVO-060 |
| 3.9 | Implement `prompt_get` MCP tool (§13.7) | CONVO-060 |
| 3.10 | Implement `prompt_set` MCP tool (create version + activate + emit `prompt_version_changed` event; §13.7) | CONVO-060 |
| 3.11 | Implement `prompt_rollback` MCP tool (reactivate previous version + event; §13.7) | CONVO-060 |
| 3.12 | Implement `prompt_diff` MCP tool (LCS-based line diff, no external deps; §13.7) | CONVO-060 |
| 3.13 | Unit + integration tests (~10 new; §15.1 specifies 5 `SystemPromptRepository` + 5 prompt MCP tools + 3 `ChatPolicyInteractor` DB tests) | |
| 3.14 | Full suite green, build clean | |

**Deliverable: ~409 existing + ~15 new = ~424 tests, system prompts fully
manageable via MCP.**

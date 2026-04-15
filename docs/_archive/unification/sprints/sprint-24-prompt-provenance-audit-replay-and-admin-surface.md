# Sprint 24 — Prompt Provenance Audit, Replay, And Admin Surface

> **Status:** Complete
> **Goal:** Turn prompt provenance into a durable audit surface that supports
> debugging, replay, and operator review across chat, admin, and eval workflows.
> **Prerequisite:** Sprint 19 complete ✅ and Sprint 23 complete ✅
> **Estimated scope:** Medium-to-large — storage extension, admin/debug route, replay tests
> **Implementation note:** As of 2026-04-12, Sprint 24 now includes durable turn-level provenance storage via `src/adapters/PromptProvenanceDataMapper.ts` and `src/lib/prompts/prompt-provenance-service.ts`, final-prompt recording in `src/app/api/chat/stream/route.ts` and `src/lib/chat/stream-pipeline.ts`, replay helpers in `src/lib/chat/prompt-runtime.ts`, admin conversation audit cards in `src/app/admin/conversations/[id]/page.tsx`, durable turn-aware `prompt_get_provenance` support in `src/lib/capabilities/shared/prompt-tool.ts`, and compact eval provenance parity in `src/lib/evals/live-runner.ts`.

## Why This Sprint Exists

Sprint 19 gives the system a stored provenance record for the most recent turn.
That is the minimum viable truth surface. An elite system goes further:

- provenance is linked to actual turns
- operators can inspect it without guessing
- historical prompt assembly can be replayed and diffed
- eval artifacts carry the same provenance shape as production turns

## What Already Landed Before Sprint 24

- Sprint 19 established compact prompt provenance and the initial
  `prompt_get_provenance` inspection path.
- Sprint 23 landed catalog-backed runtime binding and validation for the first
  migrated capability tranche, making prompt/runtime seam validation more
  trustworthy before provenance replay was added.
- `qa:unification`, `qa:runtime-integrity`, and `release:evidence` were already
  live before this sprint, so Sprint 24 could integrate with the existing
  evidence ladder instead of inventing a parallel one.

## QA Findings Before Implementation

1. **Latest-turn provenance is useful, but not enough for forensic debugging.**
   Operators need to know what happened on a specific turn, not just the last one.

2. **Prompt debugging still lacks replay.** Stored provenance helps, but it is
   stronger when the system can rebuild and diff the prompt from the original inputs.

3. **Eval and production provenance should look the same.** Without one shape,
   prompt debugging becomes environment-specific.

4. **An audit surface needs redaction rules.** Full prompt text should not be
   exposed casually if structure-only evidence is sufficient.

## Implemented In Sprint 24

1. **Persisted provenance by turn, not only by conversation**
    - Added durable prompt provenance records and assistant-message linkage via
       `src/adapters/PromptProvenanceDataMapper.ts`,
       `src/lib/prompts/prompt-provenance-service.ts`,
       `src/lib/db/tables.ts`, and `src/lib/db/migrations.ts`.
    - Moved prompt provenance recording onto the final post-tool-selection prompt
       path in `src/app/api/chat/stream/route.ts` and
       `src/lib/chat/stream-pipeline.ts` so stored provenance matches the prompt
       actually sent to the model.

2. **Added an admin/debug provenance surface**
    - `src/lib/admin/conversations/admin-conversations.ts` now loads prompt
       provenance audits into the admin conversation detail view model.
    - `src/app/admin/conversations/[id]/page.tsx` renders per-turn provenance,
       replay status, and drift diagnostics for operator review.

3. **Added replay and diff support**
    - `src/lib/chat/prompt-runtime.ts` now exposes replay helpers.
    - `src/lib/prompts/prompt-provenance-store.ts` now exposes structural diff
       helpers.
    - `src/lib/capabilities/shared/prompt-tool.ts` now supports durable
       turn-specific provenance reads with optional replay diff output.

4. **Aligned eval artifacts with production provenance**
    - `src/lib/evals/live-runner.ts` now emits compact prompt provenance in the
       final eval state using the same structure as production provenance.

5. **Hardened redaction and test coverage**
    - `src/core/use-cases/tools/inspect-runtime-context.tool.ts` now returns
       redacted structural provenance instead of casual full prompt text.
    - Prompt provenance, prompt-tool, admin conversation, stream route,
       stream-pipeline, chat-turn, and eval tests were updated to cover the new
       durable audit surface.

## Tasks

1. **Persist provenance by turn, not only by conversation**
   - Link provenance records to a user turn or assistant turn identifier
   - Preserve slot refs, section list, warnings, and surface metadata
   - Keep redacted structural storage by default

2. **Add a prompt provenance admin/debug surface**
   - Admin route or debug loader that returns provenance by conversation/turn
   - Filtered, role-restricted, and safe for operator use

3. **Add replay and diff support**
   - Given a historical turn, rebuild the prompt from stored inputs
   - Diff rebuilt structure against stored provenance
   - Surface mismatches as drift warnings

4. **Align eval artifacts with production provenance**
   - Save provenance in eval outputs using the same compact structure
   - Make production and eval provenance comparable in test fixtures

5. **Add audit and redaction tests**
   - Verify turn linkage
   - Verify redaction rules
   - Verify replay diff behavior
   - Verify non-admin callers cannot access the debug surface

## Out of Scope

- Full prompt text retention for every turn by default
- End-user UI for prompt provenance
- Rewriting prompt assembly logic itself

## Acceptance Criteria

1. Provenance is queryable per turn.
2. Admin/debug callers can inspect provenance safely.
3. Historical prompt replay and diff exists for targeted debugging.
4. Eval artifacts and production provenance share one compact structure.
5. Provenance access and redaction behavior are test-governed.

## Current QA Status

1. A prompt-runtime and provenance regression slice passed on 2026-04-12,
   including prompt-control-plane, inspect-runtime-context, chat-turn,
   chat-stream-route, stream-pipeline, and eval-live-runner coverage.
2. `npm run qa:unification` passed on 2026-04-12 after the Sprint 24 work
   landed.

## Verification

```bash
npx vitest run src/lib/prompts/
npm run qa:unification
rg "provenance" src/lib/prompts src/app/api tests
```

# Sprint 2 — Admin Audit, Portability, Cleanup, And QA Closure

> **Goal:** Land the deferred retention tranche as a releaseable unit: conversation-level transcript copy/export/import, governed admin export and purge, retention cleanup automation, and release-grade browser/evidence closure without turning chat into a thread dashboard.
> **Spec Sections:** `COR-025`, `COR-050` through `COR-056`, `COR-060` through `COR-075`, `COR-080`
> **Prerequisite:** [Sprint 0](sprint-0-retention-lifecycle-and-reversible-delete-foundation.md) and [Sprint 1](sprint-1-stop-generation-and-interrupted-stream-recovery.md) are complete, so tombstone lifecycle, deleted-state visibility, and stop/interruption recovery already exist.

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `docs/_specs/conversation-operations-and-retention/artifacts/retention-and-lifecycle-matrix.md` | Canonical defaults already lock trash restore windows, anonymous TTL/history cap, purge eligibility, privacy/compliance timelines, and role-scoped management actions. |
| `src/frameworks/ui/MessageList.tsx` | `MessageToolbar` already copies a single message via `navigator.clipboard`, so transcript copy should extend the same normalization pattern instead of inventing a second clipboard model. |
| `src/app/api/conversations/route.ts`, `src/app/api/conversations/[id]/route.ts`, `src/app/api/conversations/[id]/restore/route.ts` | Self-service conversation routes and ownership validation already exist; export/import should stay under this namespace rather than branching into a separate product surface. |
| `src/lib/admin/conversations/admin-conversations-actions.ts` | Admin restore already follows the `runAdminAction(...)` server-action pattern; admin export and purge should use the same mutation shape and revalidation flow. |
| `src/adapters/ConversationDataMapper.ts` and `src/app/admin/conversations/[id]/page.tsx` | Tombstone metadata, deleted-state filtering, and `purgeAfter` display already exist, so governed purge can build on real tombstone state rather than inventing a new lifecycle status. |
| `scripts/reap-chat-uploads.ts` and `scripts/worker-supervisor.ts` | The repo already has a small cleanup-script entrypoint pattern and a restart-with-backoff worker supervisor that should guide retention sweep automation. |
| `scripts/generate-release-evidence.ts` | Release evidence emission already exists and should absorb Sprint 2 browser/manual checks rather than creating a one-off QA artifact path. |

---

## Tasks

### 1. Treat portability and purge policy as locked Sprint 2 input

Sprint 2 should implement the already-chosen policy rules rather than reopening them:

- transcript copy is distinct from export and delete
- export/import uses exact platform JSON, not arbitrary pasted prose parsing
- export must disclose degraded attachment portability instead of promising full fidelity
- ordinary admin purge is gated by `purgeAfter`; privacy/compliance deletions hide immediately and purge within 30 days
- deactivated-user conversations remain preserved for audit and reassignment rather than cascading into deletion

Record any implementation deviation in this sprint doc rather than silently changing the parent retention contract.

Verify: documentation-only; no command required.

### 2. Add transcript copy and structured export contract

Conversation management needs a full transcript portability path, not only per-message copy.

Required behavior:

- add a conversation-level copy transcript affordance from the header/history surface using a stable plain-text or Markdown normalization format
- add `GET /api/conversations/[id]/export`
- export returns structured platform JSON containing conversation metadata, routing snapshot, ordered messages, job references, and an attachment manifest
- export ownership rules remain self-owned for ordinary users and admin-governed for admin surfaces
- attachment manifests must distinguish embedded content, durable asset references, and unavailable portable restore cases

Do not add PDF export, email-forwarding workflows, or arbitrary third-party export formats in this sprint.

Verify: add focused coverage and run

```bash
npm exec vitest run 'src/app/api/conversations/[id]/export/route.test.ts' src/core/use-cases/ConversationInteractor.test.ts tests/ux-conversations-journal.test.tsx
```

### 3. Add exact-format import and degraded attachment transparency

Import should become a structured recovery feature, not a generic parser.

Required behavior:

- add `POST /api/conversations/import`
- accept only exact platform-export JSON by file upload or exact JSON payload
- imported conversations are created as new archived conversations tagged as imported; they must not rewrite an existing live thread
- unavailable attachment assets become explicit placeholder parts rather than disappearing silently
- imported conversation surfaces must show degraded attachment state to both users and admins
- reject schema-invalid, HTML-bearing, or executable payloads as import content

Freeform prose pasted into the composer remains ordinary chat input and is explicitly out of scope for import.

Verify: add focused coverage and run

```bash
npm exec vitest run 'src/app/api/conversations/import/route.test.ts' src/hooks/chat/chatConversationApi.test.ts tests/ux-conversations-journal.test.tsx
```

### 4. Add admin export and governed purge workflows

Admins need audit-safe export and purge controls that respect the tombstone model introduced in Sprint 0.

Required behavior:

- add admin export affordances using the existing server-action pattern
- add governed purge actions that require explicit actor metadata and eligibility validation
- ordinary admin purge must be blocked before `purgeAfter` unless the workflow is a policy-specific privacy/compliance path
- purge preserves the minimum audit record required by the retention matrix and parent spec
- admin detail should surface export availability, purge eligibility, and purge-blocked reasons clearly

Do not turn purge into a default bulk action on the main admin list in this sprint.

Verify: add focused coverage and run

```bash
npm exec vitest run src/lib/admin/conversations/admin-conversations-actions.test.ts tests/admin-prompts-conversations.test.tsx tests/admin-processes.test.ts
```

### 5. Add retention cleanup jobs and policy automation

The lifecycle contract needs automated enforcement once export/purge semantics exist.

Required behavior:

- add an auditable retention sweep for purge-eligible soft-deleted conversations
- add anonymous-history cleanup that enforces the TTL and recent-history cap from the matrix
- add privacy/compliance purge queue handling that preserves only the minimal post-purge audit record
- use the repo's existing script/worker patterns so the sweep can run unattended with bounded restart behavior and clear reporting
- keep sweeps idempotent and safe to rerun

Do not mix retention cleanup with deferred-job cancellation or unrelated chat-upload cleanup semantics.

Verify: add focused coverage and run

```bash
npm exec vitest run src/adapters/ConversationDataMapper.test.ts src/adapters/ConversationEventDataMapper.test.ts tests/conversation-retention-worker.test.ts
```

### 6. Close browser proof and release evidence for the retention feature set

Sprint 2 should end with release-grade evidence rather than only unit coverage.

Required behavior:

- browser coverage proves transcript copy/export/import round trip at the product surface
- browser coverage proves degraded attachment import messaging instead of silent loss
- browser coverage proves admin export/purge guardrails where feasible without relying on private test-only backdoors
- release evidence includes Sprint 2 browser proof and any manual checks needed for admin-only flows
- QA artifacts should be emitted through the existing release-evidence path rather than a one-off document

Verify: run

```bash
npm exec vitest run 'src/app/api/conversations/[id]/export/route.test.ts' 'src/app/api/conversations/import/route.test.ts' src/lib/admin/conversations/admin-conversations-actions.test.ts tests/conversation-retention-worker.test.ts
npx playwright test tests/browser-ui/conversation-portability.spec.ts tests/browser-ui/admin-conversation-retention.spec.ts
node --env-file=.env.local --import tsx scripts/generate-release-evidence.ts --manual-check "Sprint 2 conversation retention browser proof reviewed."
```

---

## Smallest-Safe Execution Sequence

Sprint 2 should land in five mergeable slices. Each slice must leave the retention contract internally consistent and must carry its own focused gate before the next slice begins.

### Slice 1. Transcript copy and export payload contract

Scope:

- add conversation-level transcript copy
- define and expose the platform JSON export contract
- keep this slice focused on portability output, not import or purge

Exact tests to add or update:

- add `src/app/api/conversations/[id]/export/route.test.ts`
- update `tests/ux-conversations-journal.test.tsx`
- update `src/core/use-cases/ConversationInteractor.test.ts`

Gate:

```bash
npm exec vitest run 'src/app/api/conversations/[id]/export/route.test.ts' tests/ux-conversations-journal.test.tsx src/core/use-cases/ConversationInteractor.test.ts
```

### Slice 2. Import flow and degraded attachment surfacing

Scope:

- add exact-format import
- create imported archived conversations
- surface degraded attachment restore state explicitly

Exact tests to add or update:

- add `src/app/api/conversations/import/route.test.ts`
- update `src/hooks/chat/chatConversationApi.test.ts`
- update `tests/ux-conversations-journal.test.tsx`

Gate:

```bash
npm exec vitest run 'src/app/api/conversations/import/route.test.ts' src/hooks/chat/chatConversationApi.test.ts tests/ux-conversations-journal.test.tsx
```

### Slice 3. Admin export and governed purge

Scope:

- add admin export actions
- add purge eligibility checks and actor-audited purge actions
- keep privacy/compliance UI intake out of scope

Exact tests to add or update:

- add `src/lib/admin/conversations/admin-conversations-actions.test.ts`
- update `tests/admin-prompts-conversations.test.tsx`
- update `tests/admin-processes.test.ts`

Gate:

```bash
npm exec vitest run src/lib/admin/conversations/admin-conversations-actions.test.ts tests/admin-prompts-conversations.test.tsx tests/admin-processes.test.ts
```

### Slice 4. Retention cleanup automation

Scope:

- add purge-eligible and anonymous-retention sweeps
- add privacy/compliance purge execution hooks
- keep the sweep idempotent and scriptable

Exact tests to add or update:

- add `tests/conversation-retention-worker.test.ts`
- update `src/adapters/ConversationDataMapper.test.ts`
- update `src/adapters/ConversationEventDataMapper.test.ts`

Gate:

```bash
npm exec vitest run tests/conversation-retention-worker.test.ts src/adapters/ConversationDataMapper.test.ts src/adapters/ConversationEventDataMapper.test.ts
```

### Slice 5. Browser proof and release evidence closure

Scope:

- prove export/import round trip and degraded attachment messaging at the browser surface
- prove admin retention controls remain guarded
- publish Sprint 2 release evidence through the existing evidence pipeline

Exact tests to add or update:

- add `tests/browser-ui/conversation-portability.spec.ts`
- add `tests/browser-ui/admin-conversation-retention.spec.ts`
- update release evidence/manual check inputs as needed

Gate:

```bash
npm exec vitest run 'src/app/api/conversations/[id]/export/route.test.ts' 'src/app/api/conversations/import/route.test.ts' src/lib/admin/conversations/admin-conversations-actions.test.ts tests/conversation-retention-worker.test.ts
npx playwright test tests/browser-ui/conversation-portability.spec.ts tests/browser-ui/admin-conversation-retention.spec.ts
node --env-file=.env.local --import tsx scripts/generate-release-evidence.ts --manual-check "Sprint 2 conversation retention browser proof reviewed."
```

Implementation rule:

- do not begin Slice 4 or Slice 5 until Slice 1 through Slice 3 are green, because cleanup automation and browser evidence will be noisy if the export/import/purge contract is still unstable

---

## Completion Checklist

- [x] portability and purge defaults treated as fixed Sprint 2 inputs
- [x] conversation-level transcript copy and structured export contract landed
- [x] exact-format import creates archived imported conversations and surfaces degraded attachment state truthfully
- [x] admin export and governed purge workflows are auditable and eligibility-gated
- [x] retention cleanup jobs enforce anonymous TTL/history cap and purge policy automatically
- [x] focused Vitest, browser verification, and release evidence closure are complete
- [x] out-of-scope parsing, delegation, and full compliance UI work remain deferred

## QA Deviations

- None.
- Final validation closed with focused Sprint 2 Vitest coverage, targeted ESLint on touched files, a clean production build, Playwright proof for conversation portability and admin retention flows, and refreshed release evidence with no blockers or warnings. The release evidence artifact is marked conditional because the pipeline records manual checks as conditional status rather than approved status.
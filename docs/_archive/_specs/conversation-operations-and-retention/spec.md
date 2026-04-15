# Conversation Operations And Retention

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Define the product and architecture for safe conversation management across anonymous, signed-in, staff, and admin surfaces: rename, archive, restore, soft-delete, export/import, transcript copy, stop-generation, failure recovery, and admin auditability without regressing to a thread-dashboard product.
> **Dependencies:** [Conversation Memory](../conversation-memory/spec.md), [RBAC](../rbac/spec.md), [Chat Experience](../chat-experience/spec.md), [Admin Platform](../admin-platform/spec.md), [Shell Navigation And Design System](../shell-navigation-and-design-system/spec.md)
> **Affects:** `src/core/entities/conversation.ts`, `src/core/use-cases/ConversationInteractor.ts`, `src/core/use-cases/ConversationRepository.ts`, `src/app/api/conversations/**`, `src/app/api/chat/stream/route.ts`, `src/lib/chat/stream-pipeline.ts`, `src/hooks/chat/useChatSend.ts`, `src/hooks/chat/useChatStreamRuntime.ts`, `src/frameworks/ui/MessageList.tsx`, `src/lib/admin/conversations/**`, conversation event recording, and account/chat history surfaces
> **Requirement IDs:** `COR-001` through `COR-099`

---

## 1. Problem Statement

### 1.1 Current state

The repository already has strong conversation continuity primitives: `ConversationInteractor.ensureActive(...)`, `GET /api/conversations/active`, anonymous cookie-backed identity, archive-on-new-chat behavior, admin conversation browse/detail pages, and admin analytics tooling. The gap is no longer whether conversations persist. The gap is whether users and operators can manage that persistence safely. `[COR-001]`

Today the lifecycle is asymmetric:

1. ordinary users can archive an active conversation and hard-delete an owned conversation
2. admins can browse, bulk archive, and take over conversations but cannot recover a user-deleted thread
3. the chat UI can retry a failed send, but it does not expose a first-class stop-generation control or an intentional recovery path for interrupted generations
4. message copy exists for a single assistant/user turn, but conversation-level copy/export/import does not

That leaves the platform with good continuity and weak management. `[COR-002]`

### 1.2 Verified current capabilities and gaps

| Area | Verified current behavior | Gap this spec owns |
| --- | --- | --- |
| Active continuity | `ConversationInteractor.ensureActive(...)`, `getActiveForUser(...)`, and `GET /api/conversations/active` support one active conversation per resolved user id. | The active-thread model is strong, but history and destructive actions are under-specified. |
| Signed-in history | `ConversationInteractor.list(userId)` and `GET /api/conversations` expose authenticated conversation summaries. | There is no structured archive/trash/recovery UX or role-specific management contract. |
| Archive | `archiveActive(userId)` plus `POST /api/conversations/active/archive` preserve prior conversations without deleting them. | Archive is one-way for users; restore semantics are missing. |
| Delete | `DELETE /api/conversations/[id]` calls `ConversationInteractor.delete(...)`, which delegates to `ConversationRepository.delete(id)` and cascades messages. | Delete is irreversible, unaudited, and inconsistent with admin analysis needs. |
| Admin operations | `takeOverConversationAction`, `handBackConversationAction`, and `bulkArchiveConversationsAction` exist on `/admin/conversations`. | Admin can inspect and archive, but cannot restore soft-deleted threads because soft delete does not exist yet. |
| Message copy | `MessageToolbar` in `src/frameworks/ui/MessageList.tsx` writes a single message to `navigator.clipboard`. | There is no conversation-level transcript copy/export/import contract. |
| Send failure retry | `useChatSend` records failed sends and exposes `retryFailedMessage(retryKey)`. | Recovery is limited to pre-response failures; interrupted generations and user-stop are not first-class states. |
| Streaming abort | `stream-pipeline.ts` already owns an internal `AbortController` and aborts on stream cancel. | There is no user-invokable stop-generation control or intentional-stop distinction. |
| Ownership migration | `ConversationInteractor.migrateAnonymousConversations(...)` transfers anonymous conversations to the new user and records conversion events. | The lifecycle contract for deleted/exported/imported conversations across account changes is not defined. |

### 1.3 Product decision

This feature formalizes the following product shape:

1. **Chat remains conversation-first.** There is still one primary active thread, not a workspace built around dozens of visible tabs or threads. `[COR-010]`
2. **History becomes manageable.** Users need calm, explicit controls for rename, archive, restore, trash, export, and recovery without turning the chat into an inbox product. `[COR-011]`
3. **Delete means reversible removal for ordinary users.** Routine user deletion becomes soft-delete with restore and admin auditability; hard purge becomes a governed policy workflow rather than the default button semantics. `[COR-012]`
4. **Recovery is a product feature.** Stop-generation, interrupted-stream recovery, and transcript restoration are first-class lifecycle states rather than incidental error handling. `[COR-013]`

---

## 2. Design Goals

1. **Recovery before destruction.** Ordinary user actions should preserve a recovery window whenever the system can do so safely. `[COR-020]`
2. **One active conversation, managed history.** The core chat still behaves like an ongoing journal, but archived and deleted history must be understandable and controllable. `[COR-021]`
3. **Lowest-role clarity.** Anonymous users get same-browser continuity and basic recovery; signed-in users get durable history; admins get global audit and restore. `[COR-022]`
4. **Admin truth over silent loss.** User-facing removal must not destroy evidence admins need for support, quality analysis, or conversion learning. `[COR-023]`
5. **Stop means stop.** Users need an intentional generation-stop control that preserves partial work truthfully and does not masquerade as an unexpected failure. `[COR-024]`
6. **Copy and export are distinct from delete.** Users should be able to take transcript content with them without forcing destructive cleanup. `[COR-025]`
7. **User-account changes must not create retention drift.** Role changes, sign-in migration, and future account deletion flows must have explicit conversation ownership and retention behavior. `[COR-026]`
8. **The contract must stay chat-native.** Management actions should live in a header/history surface and admin browse/detail surfaces, not in a dense dashboard layered over the transcript. `[COR-027]`

---

## 3. Architecture

### 3.1 Verified current interfaces

Current conversation persistence already exposes the right baseline ports.

**`ConversationRepository` today:**

```typescript
export interface ConversationRepository {
  create(conv: {
    id: string;
    userId: string;
    title: string;
    status?: "active" | "archived";
    sessionSource?: string;
    referralId?: string;
    referralSource?: string;
  }): Promise<Conversation>;
  listByUser(userId: string): Promise<ConversationSummary[]>;
  findById(id: string): Promise<Conversation | null>;
  findActiveByUser(userId: string): Promise<Conversation | null>;
  archiveByUser(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  touch(id: string): Promise<void>;
  incrementMessageCount(id: string): Promise<void>;
  setFirstMessageAt(id: string, timestamp: string): Promise<void>;
  recordMessageAppended(id: string, timestamp: string): Promise<void>;
  setLastToolUsed(id: string, toolName: string): Promise<void>;
  setConvertedFrom(id: string, anonUserId: string): Promise<void>;
  setReferralSource(id: string, referralSource: string): Promise<void>;
  updateRoutingSnapshot(id: string, snapshot: ConversationRoutingSnapshot): Promise<void>;
  transferOwnership(fromUserId: string, toUserId: string): Promise<string[]>;
}
```

**`ConversationInteractor` currently exposes:**

```typescript
async ensureActive(
  userId: string,
  options?: { sessionSource?: string; referralId?: string; referralSource?: string },
): Promise<Conversation>;

async get(
  conversationId: string,
  userId: string,
): Promise<{ conversation: Conversation; messages: Message[] }>;

async getActiveForUser(
  userId: string,
): Promise<{ conversation: Conversation; messages: Message[] } | null>;

async list(userId: string): Promise<ConversationSummary[]>;
async delete(conversationId: string, userId: string): Promise<void>;
async archiveActive(userId: string): Promise<Conversation | null>;
async appendMessage(msg: NewMessage, userId: string): Promise<Message>;
async updateRoutingSnapshot(
  conversationId: string,
  userId: string,
  snapshot: ConversationRoutingSnapshot,
): Promise<void>;
async migrateAnonymousConversations(anonUserId: string, newUserId: string): Promise<string[]>;
```

This spec does not replace those foundations. It adds the missing lifecycle, audit, and recovery semantics on top of them. `[COR-030]`

### 3.2 Product surfaces and audiences

| Audience | Scope | Required conversation-management capability |
| --- | --- | --- |
| **ANONYMOUS** | Same browser session backed by `anon_{uuid}` ownership | View current active conversation, stop current generation, retry failed send, copy current message/transcript, archive current chat, restore the most recent session-local conversations within cookie lifetime. |
| **AUTHENTICATED** | Own conversations only | Full self-service history: list, rename, archive, restore, move to trash, restore from trash, export, import, copy transcript, stop generation, and recover interrupted sends. |
| **APPRENTICE** | Same self-owned scope as authenticated users | Same self-service conversation controls; no cross-user browse by default. |
| **STAFF** | Same self-owned scope unless another feature explicitly delegates more | Same self-service controls; no implicit expansion to other users' conversations. |
| **ADMIN** | Global browse/detail plus self-owned conversations | Full admin inspect, search, archive, restore, export, takeover/hand-back, and governed purge workflows. Admin does not silently hard-delete from the primary browse surface. |

This is intentionally conservative: role elevation does not broaden cross-user conversation management until the product explicitly needs delegated/shared conversation workflows. `[COR-031]`

### 3.3 Target lifecycle model

The current `Conversation.status` field should remain focused on conversational availability (`active` vs `archived`). Destructive lifecycle should be represented by tombstone metadata rather than by overloading the existing status field.

```typescript
interface ConversationLifecycleTombstone {
  deletedAt: string | null;
  deletedByUserId: string | null;
  deleteReason: "user_removed" | "admin_removed" | "privacy_request" | "retention_policy" | null;
  purgeAfter: string | null;
  restoredAt: string | null;
}
```

Behavioral rules:

1. `status = "active"` means the conversation is the current live thread for that owner.
2. `status = "archived"` means the conversation is part of user-visible history.
3. `deletedAt != null` means the conversation is in trash/tombstone state: hidden from default user history, restorable until `purgeAfter`, still admin-visible, still auditable. `[COR-032]`

This preserves existing archive/search behavior while making delete reversible and analyzable. `[COR-033]`

### 3.4 Target ports and route contract

The repository/interactor surface should gain explicit lifecycle methods instead of continuing to route ordinary deletion through `ConversationRepository.delete(id)`.

```typescript
interface ConversationRepository {
  softDelete(
    id: string,
    actor: { userId: string; role: RoleName; reason: string },
    policy: { purgeAfter: string },
  ): Promise<void>;
  restoreDeleted(id: string, actorUserId: string): Promise<void>;
  listByUser(
    userId: string,
    options?: { scope?: "active" | "archived" | "deleted" | "all"; limit?: number },
  ): Promise<ConversationSummary[]>;
  purge(id: string, actor: { userId: string; role: RoleName; reason: string }): Promise<void>;
}
```

User-facing HTTP contract:

```text
GET    /api/conversations?scope=active|archived|deleted|all
PATCH  /api/conversations/[id]            # rename, archive, restore, move-to-trash
POST   /api/conversations/[id]/restore
GET    /api/conversations/[id]/export
POST   /api/conversations/import
POST   /api/chat/streams/[streamId]/stop
```

Notes:

1. Anonymous users should not receive the full signed-in history surface, but they should receive a bounded same-browser recent-history endpoint or equivalent history payload for recovery. `[COR-034]`
2. `DELETE /api/conversations/[id]` should stop meaning immediate hard delete for ordinary user actions. If the route name is preserved for compatibility, its behavior must become soft-delete by default. `[COR-035]`
3. Purge remains a separate admin/system path with stricter validation and audit. `[COR-036]`

### 3.5 Stop-generation and interrupted-stream recovery

Current streaming already has an internal abort path in `stream-pipeline.ts`, but it only reacts to transport cancellation. The product needs an intentional stop-generation control.

Target contract:

1. Each active send receives a server-known `streamId` in the initial chat stream handshake.
2. `useChatStreamRuntime` exposes both `runStream(...)` and `stopStream(streamId)`.
3. `POST /api/chat/streams/[streamId]/stop` aborts the registered server-side controller for that stream.
4. A user-initiated stop persists any partial assistant text as a truthful partial response and records a lifecycle event such as `generation_stopped`.
5. An unexpected disconnect persists a distinct `generation_interrupted` event so retry/resume UX can distinguish user intent from failure. `[COR-040]`

Product behavior:

- **Stop generation** ends the live assistant response only.
- It does **not** implicitly cancel already queued deferred jobs. Job cancellation remains an explicit job action.
- If a message partially streamed before stop, that partial content remains visible and is labeled as stopped rather than failed.
- If no assistant content exists yet, the UI offers a clean retry of the last user turn instead of creating a fake apology message. `[COR-041]`

### 3.6 Copy, export, import, and transcript management

Conversation management needs a ladder of portability rather than one overloaded action.

1. **Copy message** remains a lightweight per-message affordance. `[COR-050]`
2. **Copy transcript** copies the normalized conversation transcript in plain text or Markdown from the conversation header/history surface. `[COR-051]`
3. **Export conversation** downloads a structured platform JSON export containing conversation metadata, routing snapshot, messages, job references, and an attachment manifest. The manifest must describe whether each attachment is embedded, durably addressable by a stable asset handle, or unavailable for portable restore. `[COR-052]`
4. **Import conversation** accepts only platform-export JSON in the initial version and creates a new archived conversation tagged as imported rather than rewriting an existing thread. Import may be supplied by file upload or exact exported JSON paste, but not by arbitrary freeform prose pasted from the clipboard. `[COR-053]`
5. **Rename** is explicit and user-editable; auto-title remains the bootstrap default, not the final title contract. `[COR-054]`

Attachment portability rules:

1. Export must never silently imply a full-fidelity restore if only attachment references are available.
2. Import must create explicit placeholder attachment parts for unavailable assets rather than dropping them invisibly.
3. The imported conversation detail view must surface any degraded attachment recovery state to the user and to admins. `[COR-055]`

The product should not promise arbitrary paste-to-import parsing in the first version. Freeform paste in the composer remains ordinary message input; import is a structured recovery/portability path. `[COR-056]`

### 3.7 Audit, retention, and user-account intersections

Conversation lifecycle actions must emit durable audit events with actor identity and reason metadata.

Required event coverage:

```text
started
archived
restored
renamed
soft_deleted
purged
generation_stopped
generation_interrupted
exported
imported
converted
takeover_started
takeover_ended
```

Retention rules:

1. Ordinary archived conversations remain retained until user action or explicit retention policy says otherwise.
2. Soft-deleted conversations remain restorable for a defined retention window.
3. Admins can inspect soft-deleted conversations during that window.
4. Anonymous conversations receive a shorter retention policy tied to cookie/session lifetime and cleanup jobs.
5. User deactivation or role edits do not cascade-delete conversations. Account-deletion and privacy-request workflows must explicitly choose redaction/purge behavior. `[COR-060]`

Account-lifecycle consequences:

1. **User add/create** does not backfill or expose any other user's conversations; only explicit migration or transfer changes ownership. `[COR-061]`
2. **User edit / role change** does not change conversation ownership or visibility beyond what the new role already authorizes. A promotion to `STAFF` or `ADMIN` does not implicitly grant access to non-admin conversation surfaces owned by others. `[COR-062]`
3. **User deactivation** revokes self-service access but preserves conversations for admin audit, retention, and possible reassignment. `[COR-063]`
4. **Admin reassignment or account merge** must use explicit ownership-transfer flows that emit audit events and preserve converted-from lineage. `[COR-064]`
5. **User deletion or privacy-request closure** must follow a governed policy: redact or pseudonymize where analysis must survive, then purge only through an auditable retention workflow. `[COR-065]`

This spec does **not** redefine the full admin UX for user CRUD. That remains owned by RBAC and admin-platform work. It does define the mandatory conversation consequences of those user-lifecycle operations. `[COR-066]`

---

## 4. Security And Access

1. Self-service routes may return only conversations owned by the resolved current user id, including migrated anonymous history where ownership transfer already occurred. `[COR-070]`
2. Admin restore/export/purge operations must re-authenticate and write actor metadata to the audit trail on every action. `[COR-071]`
3. Soft-deleted conversations must disappear from ordinary user history/search results by default, while remaining available to authorized admin audit surfaces. `[COR-072]`
4. Import must validate schema, attachment manifests, asset references, and size limits; it must not accept arbitrary HTML or executable payloads as trusted transcript content. `[COR-073]`
5. Stop-generation endpoints must validate stream ownership so one user cannot terminate another user's active stream. `[COR-074]`
6. Account deletion or privacy workflows must not silently bypass audit or retention policy checks. `[COR-075]`

---

## 5. Testing Strategy

| Area | Coverage expectation |
| --- | --- |
| Repository and data migration | Tombstone fields, list scopes, restore, purge, anonymous retention cleanup, ownership migration interactions |
| API routes | Rename, archive, soft-delete, restore, export, import, attachment manifest validation, stop-generation authorization, backward compatibility for legacy delete callers |
| Chat runtime | Intentional stop vs interrupted stream, partial-response persistence, retry-last-turn behavior, no fake assistant apology on user stop |
| UI | Header/history actions, trash and restore states, transcript copy/export affordances, import warnings for missing attachments, anonymous limited-history messaging |
| Admin flows | Deleted filter, restore, export, takeover/hand-back coexistence, audit event visibility |
| Browser flows | New chat, archive, restore from trash, stop generation, interrupted-stream recovery after refresh, export/import round trip, and degraded attachment recovery messaging |

Focused browser verification is required because the user-facing value here depends on recovery and lifecycle semantics, not just route payloads. `[COR-080]`

---

## 6. Sprint Plan

Sprint 0 absorbed the original self-service history and reversible-delete tranche. Sprint 1 handles stop-generation and interrupted-stream recovery. Sprint 2 now decomposes the deferred admin portability, governed purge, cleanup, and QA-closure work; later delegated/shared workflows and broader compliance UX should be drafted after that lands.

| Sprint | Name | Goal |
| --- | --- | --- |
| **0** | **Retention, Lifecycle, And Reversible Delete Foundation** | Lock retention defaults, add tombstone conversation state, replace hard delete with reversible delete, and expose deleted-state visibility to admins without changing the chat-first product shape. |
| **1** | **Stop Generation And Interrupted-Stream Recovery** | Add intentional stream stop, partial-response persistence, and explicit retry/resume handling for interrupted sends. |
| **2** | **Admin Audit, Portability, Cleanup, And QA Closure** | Add transcript copy/export/import, governed admin export/purge controls, retention cleanup jobs, and release-grade browser/evidence closure. |
| **Later** | **Delegation, Compliance UX, And Extended Portability** | Decompose delegated/shared conversation workflows, privacy/compliance request UI, and any non-platform portability formats after Sprint 2 lands. |

---

## 7. Future Considerations

1. Shared or delegated conversations for staff/admin teams after the self-owned lifecycle contract is stable.
2. Legal hold, selective redaction, and privacy-request tooling once product/legal policy is finalized.
3. Conversation branching or duplicate-as-new-thread if users later need structured what-if exploration.
4. Rich transcript sharing links if external collaboration becomes a supported product surface.

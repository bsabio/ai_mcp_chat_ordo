# Job Visibility And Control

> **Status:** Draft v0.1
> **Date:** 2026-03-25
> **Scope:** Define the product and architecture for transcript-native deferred-job updates, a first-class Jobs page in the signed-in account surface, and plain-language agent status responses for job questions.
> **Dependencies:** [Deferred Job Orchestration](../deferred-job-orchestration/spec.md), [Chat Experience](../chat-experience/spec.md), [Interactive Chat Actions](../interactive-chat-actions/spec.md), [Shell Navigation And Design System](../shell-navigation-and-design-system/spec.md), [Platform V1](../platform-v1/spec.md)
> **Affects:** chat message rendering, shell navigation, account menu routing, deferred-job read APIs, job event streaming, prompt and tool behavior for status questions, and profile/account information architecture
> **Requirement IDs:** `JVC-001` through `JVC-099`

---

## 1. Problem Statement

### 1.1 Current state

The repository already has a durable deferred-job queue, conversation-scoped SSE updates, in-message `job_status` rendering, retry/cancel actions, and browser push notifications. Those are strong primitives. The product gap is no longer durable execution itself. The gap is **where job state belongs in the user experience** and **how users inspect work outside the current conversation**. `[JVC-001]`

### 1.2 Verified current capabilities

| Area | Verified runtime state | Evidence |
| --- | --- | --- |
| Queue model | Durable jobs and append-only events already exist | `src/core/use-cases/JobQueueRepository.ts`, `src/adapters/JobQueueDataMapper.ts` |
| Chat-native updates | `UPSERT_JOB_STATUS` updates an existing assistant message in place | `src/hooks/chat/chatState.ts` |
| Conversation-scoped read path | `GET /api/chat/jobs` resolves one conversation and returns snapshots only for that conversation | `src/app/api/chat/jobs/route.ts` |
| Conversation-scoped event stream | `GET /api/chat/events` streams only one conversation's job events | `src/app/api/chat/events/route.ts` |
| Status summarization primitive | `describeJobStatus(part)` already produces plain-language job summaries | `src/lib/jobs/job-status.ts` |
| Tool support | `list_deferred_jobs` and `get_deferred_job_status` exist, but are admin-only and conversation/job scoped | `src/core/use-cases/tools/deferred-job-status.tool.ts` |
| Account surface | Signed-in account menu routes are currently resolved from `ACCOUNT_MENU_ROUTE_IDS = ["profile"]` | `src/lib/shell/shell-navigation.ts` |
| Profile area | `/profile` already exists and already hosts deferred-job notification settings | `src/app/profile/page.tsx`, `src/components/profile/ProfileSettingsPanel.tsx` |

### 1.3 Verified product problems

| # | Issue | Evidence | Impact |
| --- | --- | --- | --- |
| 1 | **No first-class user-scoped jobs surface** | `JobQueueRepository` exposes `listJobsByConversation(...)` and `listConversationEvents(...)`, but no user-scoped listing or stream. | Users cannot inspect all active/recent jobs across conversations in one place. |
| 2 | **Conversation UI and job control are not yet cleanly separated** | The current branch adds an `ActiveWorkPanel` in `ChatMessageViewport.tsx` and an expanded job summary in `FloatingChatLauncher.tsx`. | Detailed operational UI spills into chat and shell chrome, competing with conversation flow. |
| 3 | **Account navigation has no jobs destination** | `resolveAccountMenuRoutes()` currently returns only the profile route. | Signed-in users have no stable place to check work outside chat. |
| 4 | **Agent status reads are admin-only and too tool-shaped** | `list_deferred_jobs` and `get_deferred_job_status` are admin-only and map directly to snapshots. | The assistant can inspect jobs, but the product contract for user-facing prose summaries is incomplete. |
| 5 | **Current read APIs are conversation-owned, not user-owned** | `/api/chat/jobs` and `/api/chat/events` both resolve or require a single conversation id. | A Jobs page cannot be built cleanly on top of current endpoints without leaking conversation-only assumptions. |

### 1.4 Product decision

This feature formalizes the following product shape:

1. **Chat is the narrative surface.** Job status stays inside assistant messages and updates in place. `[JVC-010]`
2. **Jobs page is the operational surface.** A signed-in user can inspect all accessible jobs from a dedicated account-menu route, including work that began anonymously and was later migrated into the signed-in account. `[JVC-011]`
3. **The agent answers job questions in prose.** When asked what is happening, the assistant summarizes job state in human language rather than relying on a separate widget. `[JVC-012]`

---

## 2. Design Goals

1. **Chat stays conversational.** Detailed job state must be rendered as assistant message content, not as a persistent control panel above the transcript. `[JVC-020]`
2. **Operational visibility becomes first-class.** Signed-in users need a stable Jobs destination that survives conversation changes and reloads. `[JVC-021]`
3. **User scope before conversation scope.** The Jobs page must query work by current user ownership/visibility first, then group or link to conversations as needed, while preserving visibility for jobs created before anonymous-to-authenticated conversion. `[JVC-022]`
4. **Real-time everywhere it matters.** Transcript cards and the Jobs page must both update from durable job events rather than transient in-memory state. `[JVC-023]`
5. **Natural-language status answers.** The assistant should summarize job status in prose by default and only render enumerated lists when the user explicitly asks for them. `[JVC-024]`
6. **No duplicate sources of truth.** There must be one durable job read model feeding both chat updates and the Jobs page. `[JVC-025]`
7. **Account IA remains clean.** Jobs belongs in the signed-in account/workspace surface, but should feel like a first-class workspace destination rather than a buried preference toggle. `[JVC-026]`
8. **Access stays role-safe.** A user may see only their own or otherwise authorized jobs; admin/operator views may see more, but through explicit policy. `[JVC-027]`
9. **Architectural discipline is explicit.** The implementation must be audited against Booch object criteria, Martin SOLID principles, and GoF pattern correctness. `[JVC-028]`

---

## 3. Architecture

### 3.1 Product surfaces

```text
user action in chat
  -> deferred job created or reused
  -> assistant message gains/updates job-status card
  -> conversation-scoped SSE keeps that message current

signed-in user opens account menu -> Jobs
  -> jobs page loads user-scoped job snapshots
  -> user-scoped SSE updates active and recent jobs in real time

user asks "what jobs are happening?"
  -> assistant uses read-only job status tools/read model
  -> assistant replies in prose
  -> optional concise list only when explicitly requested
```

`[JVC-031]`

### 3.2 Current-state inventory

| Asset | Verified current detail | Implication |
| --- | --- | --- |
| `JobQueueRepository` | Exposes `createJob`, `findJobById`, `findLatestEventForJob`, `findActiveJobByDedupeKey`, `listJobsByConversation`, `appendEvent`, `listConversationEvents`, `claimNextQueuedJob`, `updateJobStatus`, `cancelJob` | User-scoped listing and event streaming are missing and must be added at the repository boundary. |
| `buildJobStatusPart(job, event)` | Builds `title`, `subtitle`, `status`, `progressPercent`, `progressLabel`, `summary`, `error`, `resultPayload` | The transcript already has the right semantic data for in-place status cards. |
| `describeJobStatus(part)` | Produces a plain-language sentence for queued/running/succeeded/failed/canceled | The prose-summary contract should reuse this style instead of inventing a separate copy layer. |
| `AccountMenu` + `resolveAccountMenuRoutes()` | Menu routes are data-driven via shell-navigation | Jobs can be added as a first-class account route without hardcoding menu items in the component. |
| `/profile` + `ProfileSettingsPanel` | Account area already includes deferred-job notification settings | Jobs should align with the account/workspace surface, not reintroduce a dashboard shell. |
| `/api/chat/jobs` + `/api/chat/events` | Both are conversation-scoped | They remain valid for transcript recovery, but are insufficient for the Jobs page. |

### 3.3 Target read models and routes

#### 3.3.1 New repository capabilities

`JobQueueRepository` must gain user-scoped read methods.

```typescript
listJobsByUser(
  userId: string,
  options?: { statuses?: JobStatus[]; limit?: number },
): Promise<JobRequest[]>;

listUserEvents(
  userId: string,
  options?: { afterSequence?: number; limit?: number },
): Promise<JobEvent[]>;

listEventsForUserJob(
  userId: string,
  jobId: string,
  options?: { limit?: number },
): Promise<JobEvent[]>;
```

The initial implementation must not rely only on `job_requests.user_id`. It must preserve visibility for jobs created under an anonymous session and later claimed by a signed-in user. That can be achieved either by migrating `job_requests.user_id` during anonymous-to-authenticated conversion or by resolving job visibility through conversation ownership and conversion lineage. Explicit policy handling for admin extensions can follow later. `[JVC-032]`

#### 3.3.2 New user-facing HTTP surfaces

Add user-scoped routes separate from chat-conversation routes.

```text
GET  /api/jobs
GET  /api/jobs/events
GET  /api/jobs/[jobId]
GET  /api/jobs/[jobId]/events
POST /api/jobs/[jobId]      # cancel/retry, if reused from current chat route semantics
GET  /jobs
```

`/api/chat/jobs` and `/api/chat/events` remain conversation-native recovery surfaces for the transcript. The new `/api/jobs*` routes are the Jobs page control plane. `[JVC-033]`

### 3.4 UI contract

#### 3.4.1 Transcript contract

The assistant message is the canonical chat representation of a job.

It must support:

- title and subtitle
- queued/running/succeeded/failed/canceled state
- progress bar when `progressPercent` exists
- current work label when `progressLabel` exists
- optional result or failure summary
- inline actions such as cancel, retry, open draft, publish, or open published post

There should be no viewport-level active-work panel. The transcript card itself is the visible job status artifact. `[JVC-034]`

#### 3.4.2 Jobs page contract

The Jobs page must provide:

- active jobs first (`running`, `queued`)
- recent terminal jobs after active work
- real-time updates
- per-job actions where authorized
- conversation link-back
- selected-job detail with event history and latest result/error summary

The detail pane must load durable history from a dedicated detail payload or a dedicated `GET /api/jobs/[jobId]/events` route. The page must not depend on having observed every event live since initial mount. `[JVC-035]`

The Jobs page is operational and diagnostic. It is not another copy of the chat transcript. `[JVC-035]`

#### 3.4.3 Shell contract

The account menu gains a `Jobs` route. The shell may later show a subtle active-job count badge, but must not show a rich launcher dashboard or transcript-sized summary card in chrome. `[JVC-036]`

### 3.5 Agent behavior contract

When the user asks status questions:

1. **General question** such as "what jobs are happening?"
   - reply with a concise prose summary of active jobs
   - mention counts and current activity
  - offer the Jobs page as the place for full detail only when the user is signed in
  - for anonymous users, keep the answer chat-native and, when appropriate, mention sign-in as the path to cross-conversation job history

2. **Specific job question** such as "what is job X doing?"
   - reply with the latest state for that single job in prose

3. **Explicit list request** such as "show me all jobs"
   - reply with a concise enumerated list or a structured message list
   - still keep the canonical operational detail on the Jobs page

This behavior should be enforced in both tool descriptions and role directives. `[JVC-037]`

### 3.6 Booch, Martin, and GoF alignment

| Lens | Required application in this feature |
| --- | --- |
| **Booch** | Separate transcript rendering, Jobs page projection, and event transport into cohesive objects/modules with minimal public surfaces. No god component that owns shell chrome, transcript, page projection, and event recovery together. |
| **Martin / SOLID** | Repository ports own durable reads; page components consume read models; prompt/tool policy does not directly depend on framework UI. User-scoped job APIs must depend on abstractions, not SQLite-specific details. |
| **GoF** | Use Facade for the Jobs page read API assembly, Observer for SSE/event propagation, Strategy for status-summary policy, and Repository for queue persistence. Do not let page components reach into mapper details directly. |

Three explicit audit sprints are part of this feature: TD-A (Booch), TD-C (Martin), TD-D (GoF). `[JVC-038]`

---

## 4. Security And Access

1. Jobs page routes require a signed-in user. Anonymous users are redirected to login. `[JVC-040]`
2. User-scoped APIs return only jobs visible to the current user, including jobs inherited through anonymous-to-authenticated migration when that conversation history was transferred. `[JVC-041]`
3. Job actions such as cancel/retry require both route authorization and business-state validation. `[JVC-042]`
4. Conversation links on the Jobs page must only navigate to conversations the current user may open. `[JVC-043]`
5. Admin/operator job-inspection behavior must remain explicit rather than silently broadening regular-user visibility. `[JVC-044]`
6. Anonymous users keep transcript-native status visibility in chat, but do not receive access to `/jobs` until authenticated. `[JVC-045]`

---

## 5. Testing Strategy

| Area | Coverage expectation |
| --- | --- |
| Repository and read model | User-scoped listing, ordering, active-only filters, conversation links, event replay |
| API routes | Auth gating, user scoping, migrated anonymous-job visibility, per-job history loading, filters, error handling, cancel/retry action safety |
| Transcript UI | In-place `job_status` updates, progress meter, current work label, no duplicate active-work panel |
| Jobs page UI | Initial load, real-time updates, filters, detail view, action dispatch, empty states |
| Agent behavior | Status questions summarize in prose, explicit list requests return enumerated statuses, anonymous users are not incorrectly pointed to `/jobs`, no dashboard-style response leakage |
| Browser flows | Account menu -> Jobs navigation, real-time status updates, conversation link-back, chat status continuity |

Focused browser coverage is required for any shell or page navigation added by this feature. `[JVC-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal |
| --- | --- | --- |
| **0** | **Transcript Contract And UI Realignment** | Remove transcript-external active-work UI, keep job state inside assistant messages, and lock the product boundary for chat vs Jobs page. |
| **1** | **User-Scoped Read Model And Event APIs** | Extend the queue repository and add signed-in user job list/detail/event routes for the Jobs page. |
| **TD-A** | **Booch Object Audit** | Audit transcript, Jobs read model, and event transport boundaries for cohesion, abstraction quality, encapsulation, and modularity. |
| **2** | **Jobs Page And Account Menu Integration** | Add `/jobs`, wire it into the account menu, and provide real-time active/recent job inspection plus actions and conversation links. |
| **3** | **Agent Status Language And List Contract** | Add role-safe job summary tools/policy so the assistant answers job questions in prose and only renders lists when explicitly requested. |
| **TD-C** | **Martin SOLID Audit** | Audit repository, page, route, and prompt/tool boundaries for SRP, DIP, OCP, and layering discipline. |
| **TD-D** | **GoF Pattern Compliance Audit** | Audit read-model assembly, SSE propagation, status-summary strategies, and repository/facade usage for pattern correctness. |

---

## 7. Future Considerations

1. Add a subtle jobs-count badge in shell chrome if active-work awareness is still too weak after the Jobs page lands.
2. Add saved filters or tabs such as `Active`, `Failures`, and `Recent completions` on `/jobs`.
3. Add richer admin/operator visibility across delegated or team-owned jobs only after the user-scoped baseline is correct.
4. Consider a transcript-native structured status list block for explicit "show all jobs" requests after the prose contract is stable.

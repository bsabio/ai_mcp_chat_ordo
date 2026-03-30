# Sprint 0 — Transcript Contract And UI Realignment

> **Goal:** Remove transcript-external active-work UI, keep durable job status inside assistant messages, and lock the product boundary for chat versus the future Jobs page.
> **Parent spec:** [Job Visibility And Control](../spec.md) §3.4, §6 Sprint 0
> **Prerequisite:** Current deferred-job chat status flow is present in the active codebase.

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `src/frameworks/ui/ChatMessageViewport.tsx` | Currently renders `ActiveWorkPanel` above the transcript and derives active jobs via `getActiveJobStatusBlocks(messages)`. |
| `src/frameworks/ui/FloatingChatLauncher.tsx` | Currently expands into an active-work pill when `activeJobs.length > 0`. |
| `src/frameworks/ui/ChatSurface.tsx` | Passes `activeJobs` from `surfaceState.presentedMessages` into `FloatingChatLauncher`. |
| `src/frameworks/ui/RichContentRenderer.tsx` | Already renders `job-status` blocks with title, subtitle, progress bar, progress label, summary, error, and actions. |
| `src/hooks/chat/chatState.ts` | `UPSERT_JOB_STATUS` updates an existing assistant message in place by `messageId` or `jobId`. |
| `src/lib/jobs/job-status.ts` | `buildJobStatusPart(...)` and `describeJobStatus(...)` already provide the semantic job data and plain-language phrasing. |

---

## Tasks

### 1. Remove transcript-external active-work UI

Delete the viewport-level active-work panel and the expanded floating launcher summary introduced on this branch.

This sprint must remove:

- the `ActiveWorkPanel` rendering path in `ChatMessageViewport.tsx`
- the rich active-work launcher state in `FloatingChatLauncher.tsx`
- any helper that exists only to support those surfaces

The transcript should remain the only detailed job UI in chat.

Verify: `npx vitest run src/frameworks/ui/ChatMessageViewport.test.tsx src/frameworks/ui/FloatingChatLauncher.test.tsx`

### 2. Keep and harden transcript-native job cards

Make the existing `job-status` block the canonical job UI artifact inside chat.

This sprint should confirm and, if needed, tighten:

- visible status tone
- progress meter
- current work label (`progressLabel`)
- result/failure summary
- inline actions

Do not add a new message-level wrapper model. Use the existing `job_status` projection path.

Verify: `npx vitest run src/frameworks/ui/RichContentRenderer.test.tsx src/adapters/ChatPresenter.test.ts`

### 3. Record the Jobs page as the future operational home

Update feature docs and any carry-forward notes so the repo record states clearly:

- chat is transcript-native
- Jobs page is the operational surface
- shell chrome should not host a detailed job dashboard

Verify: documentation-only; no runtime command required.

---

## Completion Checklist

- [ ] viewport-level active-work panel removed
- [ ] expanded active-work launcher summary removed
- [ ] transcript-native job cards remain fully functional
- [ ] docs updated to state the chat-vs-Jobs-page boundary

## QA Deviations

- None yet.

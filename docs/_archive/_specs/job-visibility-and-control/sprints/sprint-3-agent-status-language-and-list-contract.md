# Sprint 3 — Agent Status Language And List Contract

> **Goal:** Make job questions answer in plain language by default while preserving concise structured lists for explicit list requests.
> **Parent spec:** [Job Visibility And Control](../spec.md) §3.5, §6 Sprint 3
> **Prerequisite:** Sprint 2 complete

---

## Available Assets

| Asset | Verified detail |
| --- | --- |
| `src/lib/jobs/job-status.ts` | `describeJobStatus(part)` already provides plain-language summaries for one `JobStatusMessagePart`. |
| `src/core/use-cases/tools/deferred-job-status.tool.ts` | Current `list_deferred_jobs` and `get_deferred_job_status` are admin-only and conversation/job scoped. |
| `src/core/entities/role-directives.ts` | Admin directives already instruct the assistant to summarize job state in plain language after using deferred-job tools. |
| Transcript-native `job_status` blocks | Existing card rendering remains the visible UI artifact when a job is created or updated. |

---

## Tasks

### 1. Add role-safe job summary tools or adapters

The assistant needs a non-admin path to summarize the current signed-in user's jobs.

This sprint must either:

- add new role-safe tools such as `list_my_jobs` and `get_my_job_status`, or
- add an equivalent internal read path consumed by prompt/policy assembly

The contract must remain read-only and user-scoped for non-admin roles.

Verify: add top-level tool/policy coverage under `tests/` and run `npx vitest run tests/job-status-summary-tools.test.ts`

### 2. Update prompt and policy guidance

Update role directives and any tool/prompt contract needed so the assistant follows this policy:

- answer status questions in prose by default
- render a concise list only when the user explicitly asks for a list or all jobs
- do not re-run work when the user asked only for status
- offer `/jobs` only when the user is signed in; keep anonymous guidance chat-native and sign-in-aware

Verify: `npx vitest run tests/core-policy.test.ts tests/chat-policy.test.ts tests/chat-tools.test.ts`

### 3. Add behavior coverage for chat status questions

Add tests and evals covering:

- "what jobs are happening?"
- "what is job X doing?"
- "show me all jobs"
- anonymous-user status questions that should not be answered by sending the user to `/jobs`

The assertions should check for plain-language summary behavior and absence of duplicate dashboard-like UI surfaces.

Verify: `npx vitest run tests/chat-tools.test.ts tests/customer-workflow-evals.test.ts`

---

## Completion Checklist

- [ ] role-safe status-read contract added
- [ ] prompt and policy updated for prose-first job summaries
- [ ] explicit list requests covered separately from prose summaries
- [ ] focused tests/evals added

## QA Deviations

- None yet.

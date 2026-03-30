# 03 Deferred Jobs: Asynchronous Agent Task Orchestration

The Ordo system allows for **Asynchronous Execution Modes** where a task is too long-running (LLM-intensive, search-heavy, or complex generation) to run in a single HTTP request.

## The Deferred Pattern
When a tool is marked with `executionMode: "deferred"`, the system follows this workflow:

1.  **AI Request**: AI calls a deferred tool (e.g., `blog-production`).
2.  **Queue Entry**: Instead of executing inline, a new row is added to the `jobs` table via `JobQueueRepository.ts`.
3.  **UI Component**: The user receives a **Job Progress Component** in the chat stream immediately with a `jobId`.
4.  **Processor**: A background process (implied by `deferred-job-orchestration` spec) handles the actual execution.
5.  **Polling/Push**: The UI polls `/api/jobs/[id]` or receives an SSE event when the status changes (QUEUED -> RUNNING -> COMPLETED).

## Key Components
| Component | Responsibility | Key File |
| :--- | :--- | :--- |
| `JobQueueRepository` | Persisting the intent to the SQLite/Drizzle DB. | `JobQueueDataMapper.ts` |
| `JobStatusQuery` | A read-model for checking current status. | `JobStatusQuery.ts` |
| `get_my_job_status` | The AI's tool for inspecting progress. | `deferred-job-status.tool.ts` |

---

## Why this is Agent-First
In a human-first system, the user is often forced to wait for a "Loading" spinner. In an **Agent-First** system, the AI is aware that a task is "Out of Band" and can move on to other tasks or conversations, checking back on the `jobId` later.

---
*Reference for agents: If a tool returns a `jobId`, explain to the user that the task is running in the background and you will check its status periodically.*

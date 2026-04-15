# Chat Runtime Hardening

> **Status:** Implemented
> **Date:** 2026-03-15
> **Scope:** Close the remaining architectural gaps left after the March 15 chat message/composer audit. This feature covers documentation alignment, removal of the ambient command singleton from the composer path, server-side cleanup for orphaned chat uploads, and a UI regression that verifies failed sends preserve user work.
> **Affects:** `src/hooks/useCommandRegistry.ts`, `src/hooks/chat/useChatComposerController.ts`, `src/app/api/chat/uploads/route.ts`, `src/lib/user-files.ts`, user-file adapters/tests, chat container integration tests, and spec tracking docs.
> **Requirement IDs:** `CRH-XXX`

## 1. Problem Statement

The chat message/composer system was already corrected for canonical message persistence, explicit send results, and optimistic failure handling, but four gaps remained:

1. The repo’s visible task tracking no longer matched the actual completed implementation and verification state. `[CRH-010]`
2. Slash-command execution still depended on a shared mutable singleton registry under the hood, even though the composer/controller boundary had been made explicit. `[CRH-011]`
3. Failed sends triggered best-effort client cleanup, but uploads that succeeded before a tab crash or network loss could remain orphaned indefinitely on the server. `[CRH-012]`
4. The failed-send path was covered at the provider level, but there was no UI regression proving that the actual composer surface preserves both draft text and pending attachments after stream failure. `[CRH-013]`

## 2. Design Goals

1. **Document the real state.** Specs and sprint records must match the verified implementation. `[CRH-020]`
2. **No ambient command dependency.** Composer command lookup and execution must be driven by a local dependency surface, not a process-wide singleton. `[CRH-021]`
3. **Server-owned orphan recovery.** The backend must be able to reap stale unattached chat uploads without relying on the browser to finish cleanup. `[CRH-022]`
4. **User work survives failure.** Failed sends must preserve the visible draft and queued files in the actual chat UI. `[CRH-023]`
5. **Compatibility over churn.** Fixes should stay focused and avoid reopening unrelated chat runtime or homepage-shell work. `[CRH-024]`

## 3. Architecture

### 3.1 Command Dependency Boundary

Rules:

1. `useCommandRegistry()` must return command operations derived from a hook-local command catalog. `[CRH-030]`
2. Slash-command mention lookup and execution must work without importing the `commandRegistry` singleton anywhere in the active composer path. `[CRH-031]`
3. Command objects may still implement the existing `Command` interface, but registration must no longer be mutation-based. `[CRH-032]`

### 3.2 Attachment Lifecycle Recovery

Rules:

1. Chat uploads remain two-phase (`POST /api/chat/uploads` before stream submission), but the server must opportunistically reap stale unattached uploads. `[CRH-033]`
2. Reaping must target only unattached document uploads older than a TTL and must not delete files already linked to conversations. `[CRH-034]`
3. A server-side entry point must exist so operators can run the cleanup independently of browser activity. `[CRH-035]`

### 3.3 Regression Evidence

Rules:

1. There must be repository-level tests for stale-unattached file selection and deletion. `[CRH-036]`
2. There must be route coverage showing upload handling continues even if opportunistic reaping fails. `[CRH-037]`
3. There must be a UI integration proving that a failed stream after successful upload keeps the composer draft and pending file chips intact while cleanup is requested. `[CRH-038]`

## 4. Testing Strategy

The implementation must include:

1. Adapter tests for stale unattached file queries. `[CRH-040]`
2. File-system tests for physical stale-file reaping. `[CRH-041]`
3. Upload route tests for opportunistic reaper integration. `[CRH-042]`
4. Chat container integration tests for failed-send composer preservation. `[CRH-043]`
5. Full validation via `npm run quality`. `[CRH-044]`

## 5. Sprint Plan

| Sprint | Goal |
| --- | --- |
| 0 | Record the real runtime-hardening scope and align tracking/docs |
| 1 | Remove the command singleton from the active composer runtime |
| 2 | Add server-side stale chat upload reaping and operator entry points |
| 3 | Add failed-send UI regression coverage and verify the full suite |

## 6. Implementation Update

Implementation completed on 2026-03-15 with the following outcomes:

1. A dedicated `chat-runtime-hardening` spec package now records the remaining audit gaps and their verified closure.
2. `useCommandRegistry()` now builds and executes a hook-local command catalog instead of mutating or querying the shared `commandRegistry` singleton.
3. The old `chatCommandCatalog` ambient adapter has been removed from the active runtime path.
4. `UserFileRepository`, `UserFileDataMapper`, and `UserFileSystem` now support stale unattached file discovery and reaping.
5. `POST /api/chat/uploads` now runs best-effort stale upload cleanup for the current user before accepting new files.
6. `scripts/reap-chat-uploads.ts` and `npm run admin:reap-chat-uploads` provide an operator-facing cleanup entry point.
7. The chat UI now has an integration regression proving that failed sends preserve the draft and pending file chips while cleanup is requested.

Verification completed against the implementation:

- Focused runtime hardening regressions: passing
- `npm run quality`

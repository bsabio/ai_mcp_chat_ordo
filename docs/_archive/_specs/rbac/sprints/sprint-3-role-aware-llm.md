# Sprint 3 — Role-Aware LLM

> **Goal:** LLM behavior and tool access vary by role. TTS gated. Admin switcher gated.  
> **Spec ref:** §3.4, §6, §8 Phase 2  
> **Prerequisite:** Sprint 2 complete  
> **Note:** Task 3.5 was completed during Sprint 2 QA (`04a3eda`). See below.

---

## Task 3.1 — ChatPolicyInteractor + ToolAccessPolicy (core)

**What:** Move domain rules from infrastructure to core use-case layer.

| Item | Detail |
| ------ | -------- |
| **Create** | `src/core/use-cases/ChatPolicyInteractor.ts` — implements `UseCase<{ role: RoleName }, string>`, builds role-aware system prompt; also re-exports `looksLikeMath()` (moved from `policy.ts`) |
| **Create** | `src/core/use-cases/ToolAccessPolicy.ts` — `getToolNamesForRole(role)` with ANONYMOUS whitelist (6 tools: calculator, search_books, get_book_summary, set_theme, navigate, adjust_ui); returns `"ALL"` for AUTHENTICATED/STAFF/ADMIN |
| **Spec** | §2A Issues D & E, §3.4, §6, RBAC-2–7, NEG-ARCH-6 |
| **Tests (new)** | `ChatPolicyInteractor`: `"ANONYMOUS"` → includes "DEMO mode"; `"ADMIN"` → includes "system administrator". `ToolAccessPolicy`: `"ANONYMOUS"` → returns 6 tools; `"AUTHENTICATED"` → returns `"ALL"` |
| **Key details** | `ChatPolicyInteractor` composes the existing static prompt from `policy.ts` with per-role directives (ANONYMOUS=demo framing, AUTHENTICATED=full access, STAFF=analytics framing, ADMIN=system configurator). Keep `looksLikeMath()` and `getModelCandidates()` in `policy.ts` — only the prompt construction moves to core. |

---

## Task 3.2 — Wire policy into infrastructure

**What:** Update `policy.ts` and `tools.ts` to delegate to core interactors.

| Item | Detail |
| ------ | -------- |
| **Modify** | `src/lib/chat/policy.ts` — add `buildSystemPrompt(role: RoleName): string` that instantiates `ChatPolicyInteractor` and calls `execute({ role })`. Remove static `SYSTEM_PROMPT` export. Keep `looksLikeMath()` and `getModelCandidates()`. |
| **Modify** | `src/lib/chat/tools.ts` — add `getToolsForRole(role: RoleName): Anthropic.Tool[]` that calls `ToolAccessPolicy.getToolNamesForRole(role)` to filter `ALL_TOOLS`. Export both `ALL_TOOLS` (for backward compat) and `getToolsForRole()`. |
| **Spec** | §4 modified files table |
| **Tests** | Existing chat tests pass; tool filtering now role-aware |
| **Key details** | `createToolResults()` in `tools.ts` also needs a `role` parameter so it can pass role context to `SearchBooksCommand.execute()` for belt-and-suspenders truncation (Task 3.4). |

---

## Task 3.3 — Chat route session integration

**What:** Both chat routes resolve the caller's role from session and pass it to policy/tools.

| Item | Detail |
| ------ | -------- |
| **Modify** | `src/app/api/chat/stream/route.ts` — call `getSessionUser()` from `@/lib/auth` (already handles real-session-first → mock fallback → ANONYMOUS); extract `role = user.roles[0]`; call `buildSystemPrompt(role)` and `getToolsForRole(role)` from Tasks 3.1/3.2; pass both to agent loop |
| **Modify** | `src/app/api/chat/route.ts` — same session/role integration pattern |
| **Spec** | §3.4 implementation flow (7 steps), MW-4, MW-5, RBAC-2–3 |
| **Key details** | No cookie → `getSessionUser()` returns ANONYMOUS (synthetic user). Cookie present → validates via `ValidateSessionInteractor` → real role. Invalid/expired token → falls back to ANONYMOUS. Chat routes are public at middleware level (no 401) — ANONYMOUS gets limited tools/prompt. |
| **Tests (new)** | TEST-SESS-06 (no cookie → ANONYMOUS tools), TEST-RBAC-01 (ANONYMOUS limited), TEST-RBAC-02 (AUTHENTICATED full) |

---

## Task 3.4 — Belt-and-suspenders: SearchBooks + TTS gating

**What:** Server-side enforcement independent of prompt directives.

| Item | Detail |
| ------ | -------- |
| **Modify** | `src/core/use-cases/tools/BookTools.ts` — `SearchBooksCommand.execute()` accepts optional `role` context; when `role === "ANONYMOUS"`, returns titles + chapter names only (omit `matchContext`, `chapterSlug`, `bookSlug`). |
| **Modify** | `src/app/api/tts/route.ts` — call `getSessionUser()` from `@/lib/auth`; reject ANONYMOUS with 403 (`{ error: "Audio generation requires authentication" }`). No middleware change needed — TTS is public at middleware level but gated in the handler. |
| **Spec** | §6 belt-and-suspenders, RBAC-7, NEG-ROLE-2 |
| **Tests (new)** | SearchBooks with `role="ANONYMOUS"` → truncated (no matchContext). SearchBooks with `role="AUTHENTICATED"` → full output. TTS without session → 403. TTS with session → passes through. |

---

## Task 3.5 — Admin role-switcher gating ✅ COMPLETE

> **Completed in Sprint 2 QA** — commit `04a3eda`.

**What was done:** `src/app/api/auth/switch/route.ts` now:

- Validates session via `validateSession(token)` from `@/lib/auth`
- Checks `user.roles.includes("ADMIN") || process.env.NODE_ENV === "development"`
- Returns 401 if no session, 403 if not ADMIN (and not dev mode)
- On success, calls `setMockSession(role)` which writes `lms_mock_session_role` cookie

| Spec requirement | Status |
| ------------------ | -------- |
| SWITCH-1: ADMIN-only (or dev mode) | ✅ |
| SWITCH-3: Validates session via `ValidateSessionInteractor` | ✅ |
| NEG-ROLE-1: Non-ADMIN → 403 (prod) | ✅ |
| Dev-mode bypass | ✅ |

**No further action required.**

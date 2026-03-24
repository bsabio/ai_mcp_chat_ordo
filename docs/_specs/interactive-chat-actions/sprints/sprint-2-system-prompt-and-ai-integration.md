# Sprint 2 — System Prompt And AI Integration

> **Goal:** Update the system prompt with action link syntax and `__actions__` directives so the AI emits interactive affordances instead of prose instructions. Calibrate brevity expectations. Verify the AI produces correct syntax in dashboard handoff and triage flows.
> **Spec Sections:** `ICA-043`, `ICA-100` through `ICA-112`
> **Depends On:** Sprint 0 (parser recognizes action links — complete, 21/21 tests), Sprint 1 (renderer displays them — complete, 39/39 tests)
> **Historical note (2026-03-24):** The scenario framing in this sprint is still valid, but the concrete handoff file path later changed. References below to `src/lib/chat/dashboard-handoff.ts` should now be read as the historical predecessor of the active `src/lib/chat/task-origin-handoff.ts` path.

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/lib/corpus-config.ts` | `buildCorpusBasePrompt(): string` (L39–86). Returns the full system prompt string. Section headers in order: `DEFAULT FRAMING:` (L44), `RESPONSE STYLE - be miserly with words:` (L48), `TOOLS:` (L53), `UI CONTROL:` (L64), `DYNAMIC SUGGESTIONS (MANDATORY - never skip):` (L68). No existing mention of "action link", "INTERACTIVE", or `__actions__`. The prompt ends with `__suggestions__` rules. Also exports `getCorpusToolName()`, `getCorpusSearchDescription()`, `getCorpusSummaryDescription()`. |
| `src/lib/chat/dashboard-handoff.ts` | `getDashboardHandoffInstruction(handoff): string` (L78–113) — `switch` on `handoff.sourceContextId` with 15 named cases and a `default` that delegates to `getBlockFallbackInstruction(handoff.sourceBlockId)`. Key cases for this sprint: `"lead-queue:header"` (L81), `"routing-review:header"` (L83), `"conversation-workspace:resume"` (L87), `"conversation-workspace:start"` (L89). `buildDashboardHandoffContextBlock(handoff): string` (L148–167) builds the server-owned context block appended to system prompt. |
| `src/lib/chat/policy.ts` | `buildSystemPrompt(role): Promise<string>` (L12–25). Composes prompt from: `buildCorpusBasePrompt()` as `BASE_PROMPT` fallback (L10) → DB prompt repository → role directives → `ChatPolicyInteractor.execute()`. DB active prompt takes precedence over hardcoded `BASE_PROMPT`. |
| `tests/system-prompt.test.ts` | 14 tests across 4 `describe` blocks: `SystemPromptDataMapper` (5), `ChatPolicyInteractor (DB-backed)` (4), `Prompt management operations` (5), `prompt_version_changed events` (2). Tests the DB-backed prompt pipeline. Does **not** test `buildCorpusBasePrompt()` content directly. |
| `tests/dashboard-chat-handoff.test.ts` | 3 tests: preserves distinct block-header / focus-rail contexts, normalizes spoofed context IDs, accepts conversation workspace start handoff. Tests `normalizeDashboardChatHandoff()` and `buildDashboardHandoffContextBlock()` output. Does **not** test `getDashboardHandoffInstruction()` return values directly. |
| `src/lib/corpus-config.test.ts` | **Does not exist** — must be created for Sprint 2 prompt content assertion tests. |
| `src/core/entities/rich-content.ts` | (Sprint 0) Exports `ActionLinkType = "conversation" \| "route" \| "send" \| "corpus"`, `INLINE_TYPES.ACTION_LINK`, extended `InlineNode` union with `action-link` variant. |
| `src/adapters/ChatPresenter.ts` | (Sprint 0) `ACTION_REGEX = /__actions__:\[([\s\S]*?)\]/`, `VALID_ACTION_TYPES` set, `MessageAction` interface, `PresentedMessage.actions: MessageAction[]`. Parser and presenter already handle action link syntax and `__actions__` extraction. |

---

## Tasks

### 1. Add INTERACTIVE ACTION FORMATTING section to system prompt

In `src/lib/corpus-config.ts`, inside `buildCorpusBasePrompt()`, add a new section **after** the `UI CONTROL:` block (L64–67) and **before** `DYNAMIC SUGGESTIONS (MANDATORY - never skip):` (L68):

```
INTERACTIVE ACTION FORMATTING:
When your response references a clickable entity — a person, conversation, lead, training path, or route — emit an action link instead of plain text:
- Person or conversation: [Morgan Lee](?conversation=conv_seed_rev_001)
- Page navigation: [Training dashboard](?route=/dashboard/training)
- Follow-up prompt: [Send advisory offer](?send=Draft advisory offer for Morgan Lee at Northstar Ops)
- Corpus section: [Service Design](?corpus=service-design-principles)

Syntax: [visible label](?actionType=value)
Supported types: conversation, route, send, corpus.
Do NOT wrap the label in bold or other formatting — the link styling handles emphasis.
Do NOT explain what a link does in text. The link IS the instruction.
Only use conversation action links when entity IDs are provided in the context (e.g., via dashboard handoff). For ad-hoc requests without specific IDs, prefer corpus and route action types.

WRONG: "Open Morgan Lee's conversation (conversationId=conv_seed_rev_001) and send a scoped advisory offer."
RIGHT: "[Morgan Lee](?conversation=conv_seed_rev_001) — Northstar Ops, score 100. Needs a first reply."
```

Constraints:
- Insert between `UI CONTROL` and `DYNAMIC SUGGESTIONS` — do not modify either of those existing sections
- Use the same terse bullet-point style as the existing `RESPONSE STYLE` section
- Must include all four action type examples (conversation, route, send, corpus) `[ICA-100–103]`
- Must include the entity-ID availability constraint (only use `conversation` when IDs are in context) `[ICA-108]`

Verify: `npm run typecheck`

### 2. Add `__actions__` directive to system prompt

In `src/lib/corpus-config.ts`, add to the INTERACTIVE ACTION FORMATTING section (appended immediately after the WRONG/RIGHT examples from Task 1):

```
PER-MESSAGE ACTIONS (when response involves executable next steps):
Before __suggestions__, append on its own line:
__actions__:[{"label":"Open Morgan's thread","action":"conversation","params":{"id":"conv_seed_rev_001"}},{"label":"Send advisory offer","action":"send","params":{"text":"Draft a scoped advisory offer for Morgan Lee"}}]

Rules:
- Max 3 actions per message. Prioritize the most urgent next step.
- Label: verb-first, under 40 characters.
- Types: conversation, route, send, corpus.
- Only when the response describes concrete next steps — not for informational answers.
- __actions__ goes BEFORE __suggestions__ in the response.
- Do NOT duplicate the same action as both an inline link AND a chip. Inline links = contextual entity references woven into prose. Chips = primary call-to-action buttons for the message.
```

Constraints:
- The `__actions__` directive must not modify the existing `__suggestions__` mandate — both tags coexist `[ICA-048]`
- Response order: content → `__actions__` → `__suggestions__` `[ICA-106]`
- Must include redundancy guidance (inline links vs chips are different) `[ICA-107]`
- Must include max-3-per-message rule `[ICA-105]`
- Must include verb-first, under-40-chars label guidance

Verify: `npm run typecheck`

### 3. Tighten brevity instructions

In `src/lib/corpus-config.ts`, in the `RESPONSE STYLE - be miserly with words:` section (L48–52), **append** two new bullets after the existing four:

```
- When referencing entities, use action links instead of prose instructions. Never write "Open conversation X" when you can write [label](?conversation=X).
- Operator briefs (NOW/NEXT/WAIT): keep each card to 2-3 bullet points max. Entity names are action links, not bold text.
```

Constraints:
- Do not remove or modify the existing four bullets `[ICA-043]`
- Append at the end of the bullet list, before the `TOOLS:` section

Verify: `npm run typecheck`

### 4. Update dashboard handoff instructions to reference action link syntax

In `src/lib/chat/dashboard-handoff.ts`, update `getDashboardHandoffInstruction()` for three key switch cases. Append a single sentence to the existing return string for each:

**Case `"lead-queue:header"` (L81):** Append: ` Use action links for lead names and conversation references.`

**Case `"routing-review:header"` (L83):** Append: ` Use action links for thread references.`

**Case `"conversation-workspace:resume"` (L87):** Append: ` Use action links for conversation and contact references.`

Also update `getBlockFallbackInstruction()` for corresponding fallback cases:

**Case `"lead_queue"` (L64):** Append: ` Use action links for lead names.`

**Case `"routing_review"` (L66):** Append: ` Use action links for thread references.`

**Case `"conversation_workspace"` (L72):** Append: ` Use action links for conversation references.`

Constraints:
- Each addition is a single sentence appended to the existing string — do not rewrite existing instructions
- Keep additions under 15 words each
- Only modify cases where entity references are common (lead_queue, routing_review, conversation_workspace) — skip focus-rail and recent-conversations cases

Verify: `npm run typecheck`

### 5. Create prompt content assertion tests

Create `src/lib/corpus-config.test.ts` with the following tests:

```typescript
import { describe, it, expect } from "vitest";
import { buildCorpusBasePrompt } from "./corpus-config";

describe("buildCorpusBasePrompt", () => {
  const prompt = buildCorpusBasePrompt();

  // --- Section presence ---
  it("contains INTERACTIVE ACTION FORMATTING section header");
  it("contains __actions__ directive with syntax example");
  it("preserves existing __suggestions__ mandate");
  it("preserves existing TOOLS section");

  // --- Action type examples ---
  it("contains action link example for conversation type");
  it("contains action link example for route type");
  it("contains action link example for send type");
  it("contains action link example for corpus type");

  // --- Constraints and guidance ---
  it("contains entity ID availability constraint");
  it("contains inline-vs-chip redundancy guidance");
  it("contains max 3 actions per message rule");
  it("contains verb-first label guidance");

  // --- Section ordering ---
  it("places INTERACTIVE ACTION FORMATTING after UI CONTROL");
  it("places INTERACTIVE ACTION FORMATTING before DYNAMIC SUGGESTIONS");
  it("places __actions__ before __suggestions__ in directive order");

  // --- Brevity updates ---
  it("updated RESPONSE STYLE references action links");
  it("updated RESPONSE STYLE references operator brief card limits");
});
```

Constraints:
- Tests are string-content assertions (`prompt.includes(...)` or `prompt.indexOf(...)` ordering checks) — not AI behavior tests
- Follow the `describe`/`it`/`expect` vitest pattern consistent with the rest of the codebase
- Each test is independent and describes exactly one assertion

Verify: `npm exec vitest run src/lib/corpus-config.test.ts`

### 6. Update dashboard handoff tests

In `tests/dashboard-chat-handoff.test.ts`, add tests verifying the action link guidance was added:

```typescript
it("lead-queue header instruction includes action link guidance");
it("routing-review header instruction includes action link guidance");
it("conversation-workspace resume instruction includes action link guidance");
it("lead_queue fallback instruction includes action link guidance");
```

Constraints:
- Import `getDashboardHandoffInstruction` (it's not currently imported in the test file — only `buildDashboardHandoffContextBlock` and `normalizeDashboardChatHandoff` are imported)
- Each test calls `getDashboardHandoffInstruction()` with the appropriate handoff object and asserts the return string contains "action link"
- Keep tests minimal — one assertion each

Verify: `npm exec vitest run tests/dashboard-chat-handoff.test.ts`

---

## Test Matrix

### Positive Tests — Prompt Content (src/lib/corpus-config.test.ts)
- [x] System prompt contains `"INTERACTIVE ACTION FORMATTING"` section header
- [x] System prompt contains `__actions__` directive with JSON syntax example
- [x] System prompt contains action link example for `conversation` type (`?conversation=`)
- [x] System prompt contains action link example for `route` type (`?route=`)
- [x] System prompt contains action link example for `send` type (`?send=`)
- [x] System prompt contains action link example for `corpus` type (`?corpus=`)
- [x] System prompt contains entity ID availability constraint ("Only use conversation action links when entity IDs are provided")
- [x] System prompt contains inline-vs-chip redundancy guidance ("Do NOT duplicate")
- [x] System prompt contains max 3 actions per message rule
- [x] System prompt contains verb-first label guidance ("verb-first, under 40 characters")
- [x] Updated RESPONSE STYLE contains action link reference ("use action links instead of prose instructions")
- [x] Updated RESPONSE STYLE contains operator brief card limit ("2-3 bullet points max")

### Positive Tests — Dashboard Handoff (tests/dashboard-chat-handoff.test.ts)
- [x] `getDashboardHandoffInstruction()` for `"lead-queue:header"` mentions action links
- [x] `getDashboardHandoffInstruction()` for `"routing-review:header"` mentions action links
- [x] `getDashboardHandoffInstruction()` for `"conversation-workspace:resume"` mentions action links
- [x] `getBlockFallbackInstruction()` for `"lead_queue"` mentions action links (tested via `getDashboardHandoffInstruction` default path)

### Positive Tests — Additional Handoff Coverage
- [x] `getBlockFallbackInstruction()` for `"routing_review"` mentions action links
- [x] `getBlockFallbackInstruction()` for `"conversation_workspace"` mentions action links
- [x] `getDashboardHandoffInstruction()` for `"training-path-queue:header"` preserves original key phrase ("learner recommendation")

### Negative Tests — Preservation
- [x] Existing `__suggestions__` mandate text is unchanged (entire DYNAMIC SUGGESTIONS block preserved)
- [x] Existing TOOLS section is unchanged (all 9 tool names present)
- [x] Existing tool descriptions are unchanged (search_corpus, get_section, etc.)
- [x] No new tools added — action links are formatting, not tools
- [x] Existing dashboard handoff instructions for `"focus-rail:overview"` are unchanged
- [x] Existing dashboard handoff instructions for `"recent-conversations:overview"` are unchanged

### Negative Tests — Ordering
- [x] `"INTERACTIVE ACTION FORMATTING"` does NOT appear before `"UI CONTROL"`
- [x] `"DYNAMIC SUGGESTIONS"` does NOT appear before `"INTERACTIVE ACTION FORMATTING"`
- [x] `"__actions__"` directive appears before `"__suggestions__"` in the prompt

### Edge Cases
- [x] `buildCorpusBasePrompt()` produces a non-empty string
- [x] Prompt string contains no unpaired template literal placeholders (`${...}` that didn't resolve)
- [x] WRONG/RIGHT examples in prompt contain the contrasting patterns
- [x] Dashboard handoff instructions that were NOT modified still contain their original key phrases (spot-check: `"training-path-queue:header"` still contains "learner recommendation")
- [x] Combined prompt (base + handoff block) stays under 4000 tokens (rough character check: under 16000 chars for base prompt alone)

---

## Completion Checklist

- [x] INTERACTIVE ACTION FORMATTING section added to `buildCorpusBasePrompt()` after UI CONTROL, before DYNAMIC SUGGESTIONS
- [x] `__actions__` directive added with rules, syntax example, and max-3 rule
- [x] Brevity rules in RESPONSE STYLE updated to reference action links and operator brief limits
- [x] Dashboard handoff instructions updated for `lead-queue:header`, `routing-review:header`, `conversation-workspace:resume`
- [x] Dashboard fallback instructions updated for `lead_queue`, `routing_review`, `conversation_workspace`
- [x] Existing `__suggestions__` mandate preserved verbatim
- [x] Existing TOOLS section preserved verbatim
- [x] Entity ID availability constraint included in prompt directives `[ICA-108]`
- [x] Redundancy guidance (inline links vs chips) included in prompt directives `[ICA-107]`
- [x] `src/lib/corpus-config.test.ts` created with prompt content assertion tests
- [x] `tests/dashboard-chat-handoff.test.ts` updated with action link guidance assertions
- [x] `npm run typecheck` clean
- [x] `npm run build` succeeds
- [x] All new tests pass

---

## QA Deviations

- **Test matrix expanded**: Added 3 positive tests beyond the original 30 — `routing_review` fallback, `conversation_workspace` fallback, and `training-path-queue:header` preservation. Test matrix now 33/33.
- **Test file counts**: `src/lib/corpus-config.test.ts` has 21 tests (spec called for ~17). Extra tests cover edge cases: non-empty string, no unresolved template placeholders, WRONG/RIGHT examples, character limit.
- **`tests/dashboard-chat-handoff.test.ts`** has 7 new tests (spec called for 4). Added coverage for all 3 fallback cases and 1 preservation check.

---

## Verification Results

- `npx vitest run src/lib/corpus-config.test.ts` — **21/21 passed**
- `npx vitest run tests/dashboard-chat-handoff.test.ts` — **10/10 passed** (3 existing + 7 new)
- `npx tsc --noEmit` — **clean**
- `npm run build` — **success**
- Full suite: **1066/1066 tests passed**, 175/175 test files passed (1 pre-existing Playwright spec file excluded)

---

## Verification

```bash
npm exec vitest run src/lib/corpus-config.test.ts
npm exec vitest run tests/dashboard-chat-handoff.test.ts
npm run typecheck
npm run build
```

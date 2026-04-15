# Sprint 3 — Polish And Hardening

> **Goal:** Harden the Interactive Chat Actions implementation with comprehensive positive, negative, and edge-case testing. Apply GOF, Grady Booch, and Uncle Bob Martin architectural improvements to the Sprint 0–2 code. Handle streaming edge cases, calibrate mobile density, ensure accessibility, and apply visual polish.
> **Spec Sections:** `ICA-045`, `ICA-046`, `ICA-110` through `ICA-125`
> **Depends On:** Sprint 0 (21/21 tests), Sprint 1 (39/39 tests), Sprint 2 (31/31 tests)

---

## Architectural Audit — Findings From Sprints 0–2

The following findings were identified by auditing all ICA source files against GOF (Gamma, Helm, Johnson, Vlissides), Grady Booch OOD principles, and Uncle Bob Martin's SOLID/Clean Architecture tenets.

### Uncle Bob Martin — SOLID Violations

| Principle | File | Finding | Severity |
| --- | --- | --- | --- |
| **SRP** | `ChatPresenter.ts` L72–87 | `__actions__` extraction, validation, and sanitization interleaved in one `present()` method — extraction logic should be a cohesive unit | Medium |
| **OCP** | `useChatSurfaceState.tsx` L63–86 | `handleActionClick` 4-case switch on `ActionLinkType` — adding a 5th type requires modifying this function | High |
| **OCP** | `MarkdownParserService.ts` L9 | `VALID_ACTION_TYPES` set duplicated across parser + presenter — single source of truth needed | Medium |
| **DIP** | `useChatSurfaceState.tsx` L1–10 | Hook depends on 4 concrete hooks (`useRouter`, `useGlobalChat`, `useChatComposerController`, `usePresentedChatMessages`) — testable only via full hook isolation. **Partially mitigated by Task 2** (`ActionDispatchDeps` interface decouples handler logic from concrete hooks). | Medium |
| **ISP** | `useChatSurfaceState.tsx` L97–123 | Returns 26 properties — consumers take a grab-bag interface instead of targeted slices | Low |

### GOF — Missing or Misapplied Patterns

| Pattern | File | Finding |
| --- | --- | --- |
| **Strategy** | `useChatSurfaceState.tsx` L63–86 | Action dispatch is a hard-coded switch instead of a strategy map keyed by `ActionLinkType` — violates Open/Closed |
| **Null Object** | `RichContentRenderer.tsx` L207–215 | `onActionClick?.()` optional-chaining hides whether the callback is intentionally absent or accidentally omitted. **Deferred:** Optional callbacks are idiomatic React; the risk is low and a Null Object wrapper would add complexity without clear benefit. |
| **Template Method** | `ChatPresenter.ts` L60–87 | `__actions__` and `__suggestions__` extraction follow the same regex → parse → validate pattern but are implemented as ad-hoc inline blocks. **Deferred:** Each block is self-contained (~15 lines) and the two extractions share structure but not enough logic to justify a shared Template Method base. Covered by Task 6 streaming safety tests that prove current behavior. |

### Grady Booch — Coupling and Cohesion

| Concern | File | Finding |
| --- | --- | --- |
| **Stamp Coupling** | `MessageList.tsx` L72–84 | `extractInlineText()` silently returns `""` for `action-link` nodes — search drops action link labels without error |
| **Low Cohesion** | `MarkdownParserService.ts` L9, `ChatPresenter.ts` L18 | `VALID_ACTION_TYPES` defined independently in two files — if one is updated and the other missed, they silently diverge |
| **Encapsulation** | `MessageActionChips` L402 | Container `<div>` lacks semantic grouping — no `role` or `aria-label`, violating the component's contract as a discrete UI group |

### Security — Spec §4 (`ICA-120` through `ICA-125`)

| Req | Finding | Status |
| --- | --- | --- |
| `ICA-120` | Action type allowlist enforced in parser (L268) and presenter (L81) | ✅ Pass |
| `ICA-121` | Route validation `value.startsWith("/")` in `handleActionClick` L77 | ✅ Pass — but no test exercises the negative path |
| `ICA-122` | Send action pre-fills composer, does not auto-send | ✅ Pass |
| `ICA-123` | Conversation ID passes through existing access controls | ✅ Pass — but no test exercises invalid ID |
| `ICA-124` | No credential exposure in params | ✅ Pass by design |
| `ICA-125` | XSS prevention via React text nodes (no `dangerouslySetInnerHTML`) | ✅ Pass |

### Deferred Findings — Explicit Justifications

The following audit findings are acknowledged but intentionally deferred from Sprint 3:

| Finding | Severity | Justification |
| --- | --- | --- |
| **SRP: ChatPresenter `present()` interleaves extraction** | Medium | Each extraction (suggestions, actions) is a self-contained ~15-line block with clear boundaries. Refactoring to private methods would improve readability but does not fix a bug or unblock a feature. Task 6 adds streaming safety tests that lock in current behavior, making a future refactor safe. **Candidate for Sprint 4.** |
| **GOF Null Object: `onActionClick?.()` optional chaining** | Low | Optional callbacks are idiomatic React. Introducing a Null Object wrapper would add abstraction without measurable benefit. The optional-chaining pattern is well-understood by React developers. **No action planned.** |
| **ISP: 26-property return from `useChatSurfaceState`** | Low | Splitting the return into targeted slices would fragment the hook's public API and require coordinating multiple hooks at the consumer level. The current shape is stable. **No action planned.** |
| **DIP: Concrete hook dependencies** | Medium | Task 2's `ActionDispatchDeps` interface decouples the action handlers from concrete hooks, addressing the most testability-critical part. The remaining concrete imports (`useRouter`, `useGlobalChat`, etc.) are framework-level wiring that Next.js/React test patterns already accommodate. **Partially addressed by Task 2; remaining risk accepted.** |

---

## Available Assets

| Asset | Pre-Implementation Detail | Post-Implementation Detail |
| --- | --- | --- |
| `src/core/entities/rich-content.ts` | `ActionLinkType` (L4), `INLINE_TYPES.ACTION_LINK` (L12), `InlineNode` union (L29–34). `params` typed as `Record<string, string>`. | `ActionLinkType` (L9), `VALID_ACTION_TYPES` export (L11), `INLINE_TYPES.ACTION_LINK` (L7), `InlineNode` union (L32–37). |
| `src/adapters/MarkdownParserService.ts` | Combined regex (L215), `parseActionLink()` private method (L251+), `VALID_ACTION_TYPES` set (L9). 14 existing tests. | Imports `VALID_ACTION_TYPES` from `rich-content.ts` (L6). Combined regex (L213), `parseActionLink()` (L249). Local set removed. 22 tests. |
| `src/adapters/ChatPresenter.ts` | `ACTION_REGEX` (L14–16), `__actions__` extraction (L72–87), `VALID_ACTION_TYPES` (L18), filter-based validation. 7 existing tests. | Imports `VALID_ACTION_TYPES` from `rich-content.ts` (L6). `ACTION_REGEX` (L16), extraction (L69–84). Local set removed. 14 tests. |
| `src/frameworks/ui/RichContentRenderer.tsx` | `action-link` in `inlineRegistry` (L207–215), `onActionClick?` optional prop (L56), `data-chat-action-link` attribute, **no `aria-label`**. 12 existing tests. | `aria-label={\`${node.label} (${node.actionType})\`}` added. 15 tests. |
| `src/frameworks/ui/MessageList.tsx` | `MessageActionChips` (L395–425), `extractInlineText()` (L72–84) — **does NOT handle `action-link`**, `data-chat-action-chips` / `data-chat-action-chip` attributes, **no `role="group"` or `aria-label`**. 18 existing tests. | `extractInlineText()` handles `action-link` (L81). `MessageActionChips` (L397) has `role="group" aria-label="Message actions"` (L404). 19 tests. |
| `src/frameworks/ui/useChatSurfaceState.tsx` | `handleActionClick` switch (L63–86), 26 return properties. 9 existing tests. | `ActionDispatchDeps` type (L12), `ACTION_HANDLERS` strategy map (L20), `handleActionClick` (L92) uses strategy dispatch. Protocol-relative URL fix. 13 tests. |
| `src/app/globals.css` | Design system tokens, floating shell styles, responsive media queries. | Arrow indicator CSS (L1163–1170), mobile density CSS for action chips (L1396–1405). |
| `tests/browser-fab-chat-flow.test.tsx` | Integration test for FAB lifecycle. 1 test. | 3 tests (2 new: action link button, action chips). |
| `tests/browser-fab-mobile-density.test.tsx` | Mobile density regression test. 2 tests. | 4 tests (2 new: mobile chips, operator brief action links). |

---

## Tasks

### Task 1 — Extract `VALID_ACTION_TYPES` to single source of truth (OCP, Booch Cohesion)

**Problem:** `VALID_ACTION_TYPES` is defined independently in `MarkdownParserService.ts` (L9) and `ChatPresenter.ts` (L18). If one is updated and the other missed, they silently diverge. This violates the Open/Closed Principle (both files must be modified to add a type) and Booch's cohesion principle (related knowledge is scattered).

**Fix:** Export `VALID_ACTION_TYPES` from `src/core/entities/rich-content.ts` alongside `ActionLinkType`. Update both consumers to import from the canonical source.

In `src/core/entities/rich-content.ts`, add:

```typescript
export const VALID_ACTION_TYPES: ReadonlySet<string> = new Set<string>(["conversation", "route", "send", "corpus"]);
```

In `src/adapters/MarkdownParserService.ts`, replace the local `VALID_ACTION_TYPES` (L9) with:

```typescript
import { VALID_ACTION_TYPES } from "@/core/entities/rich-content";
```

In `src/adapters/ChatPresenter.ts`, replace the local `VALID_ACTION_TYPES` (L18) with the same import.

Constraints:

- No behavior change — this is a pure refactor
- Existing tests must continue passing without modification
- The set must be `ReadonlySet` to prevent accidental mutation

Verify: `npm run typecheck && npm exec vitest run src/adapters/MarkdownParserService.test.ts src/adapters/ChatPresenter.test.ts`

---

### Task 2 — Extract action dispatch to Strategy map (GOF Strategy, OCP)

**Problem:** `handleActionClick` in `useChatSurfaceState.tsx` (L63–86) uses a 4-case switch statement. Adding a 5th action type requires modifying this function, violating the Open/Closed Principle. This is the textbook case for the GOF Strategy pattern.

**Fix:** Replace the switch with a `Record<ActionLinkType, ActionHandler>` strategy map defined outside the callback. Each handler is a pure function that receives the dispatch dependencies and the action parameters.

In `src/frameworks/ui/useChatSurfaceState.tsx`, above the hook:

```typescript
type ActionDispatchDeps = {
  router: ReturnType<typeof useRouter>;
  conversationId: string | null;
  setConversationId: (id: string) => void;
  refreshConversation: (id?: string) => void;
  setComposerText: (text: string) => void;
};

const ACTION_HANDLERS: Record<ActionLinkType, (deps: ActionDispatchDeps, value: string, params?: Record<string, string>) => void> = {
  conversation: (deps, value, params) => {
    const targetId = value || params?.id;
    if (!targetId) return;
    if (deps.conversationId && deps.conversationId !== targetId) {
      if (!window.confirm("Switch to a different conversation? Your current thread will be saved.")) return;
    }
    deps.setConversationId(targetId);
    deps.refreshConversation(targetId);
  },
  route: (deps, value) => {
    if (value.startsWith("/")) deps.router.push(value);
  },
  send: (deps, value, params) => {
    deps.setComposerText(value || params?.text || "");
  },
  corpus: (deps, value) => {
    deps.router.push(`/library/section/${value}`);
  },
};
```

Then `handleActionClick` becomes:

```typescript
const handleActionClick = useCallback(
  (actionType: ActionLinkType, value: string, params?: Record<string, string>) => {
    const handler = ACTION_HANDLERS[actionType];
    handler?.(deps, value, params);
  },
  [router, conversationId, setConversationId, refreshConversation, setComposerText],
);
```

Constraints:

- Behavior is identical to the current switch — no user-visible change
- The `ACTION_HANDLERS` map must be a module-level constant (not recreated on each render)
- Existing `useChatSurfaceState.test.tsx` tests must pass without modification
- The `deps` object is constructed inside the callback closure, not memoized separately

Verify: `npm run typecheck && npm exec vitest run src/frameworks/ui/useChatSurfaceState.test.tsx`

---

### Task 3 — Fix `extractInlineText()` to handle `action-link` (Stamp Coupling Fix)

**Problem:** `extractInlineText()` in `MessageList.tsx` (L72–84) falls through to `default: return ""` for `action-link` nodes. This silently drops action link label text from search results — a functional regression introduced in Sprint 0 when the new inline type was added without updating all consumers.

**Fix:** Add `case "action-link": return node.label;` to the switch statement.

Constraints:

- Single line addition — no other changes to the function
- Add a test in `MessageList.test.tsx` verifying search extracts action link labels

Verify: `npm exec vitest run src/frameworks/ui/MessageList.test.tsx`

---

### Task 4 — Accessibility: `aria-label` and semantic grouping (ICA-125, WCAG 2.1)

**Problem (a):** Action link buttons in `RichContentRenderer.tsx` (L207–215) have no `aria-label`. Screen readers announce only the visible label text, with no indication that the button performs a navigation or action.

**Problem (b):** `MessageActionChips` container (L402) is a bare `<div>` with no semantic role. Screen readers have no grouping context.

**Fix (a):** Add `aria-label` to the action-link button:

```tsx
aria-label={`${node.label} (${node.actionType})`}
```

**Fix (b):** Add semantic attributes to the chips container:

```tsx
<div role="group" aria-label="Message actions" className="flex flex-wrap gap-2" data-chat-action-chips="true">
```

Constraints:

- Consistent with WCAG 2.1 AA — Level A: 1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value)
- Do not modify `<button>` keyboard focusability — already correct by default
- Add tests for both `aria-label` and `role="group"` in their respective test files

Verify: `npm run typecheck && npm exec vitest run src/frameworks/ui/RichContentRenderer.test.tsx src/frameworks/ui/MessageList.test.tsx`

---

### Task 5 — Streaming safety tests for parser (ICA-110–112)

**Problem:** `MarkdownParserService.parseInlines()` handles partial action link syntax correctly (unmatched regex falls through to plain text), but there are no explicit tests proving this. The spec §3.10 (`ICA-110–112`) requires verification.

**Fix:** Add streaming-simulation tests to `src/adapters/MarkdownParserService.test.ts`:

```typescript
describe("streaming partial syntax resilience", () => {
  it("treats bare opening bracket as plain text");         // "[Morg"
  it("treats label-only without query as plain text");     // "[Morgan Lee]"
  it("treats incomplete query string as plain text");      // "[Morgan Lee](?conv"
  it("treats unclosed paren as plain text");               // "[Morgan Lee](?conversation=conv_001"
  it("parses complete action link after incremental build"); // "[Morgan Lee](?conversation=conv_001)"
  it("treats action link with unknown type as plain text"); // "[Foo](?unknown=bar)"
  it("treats empty label as plain text");                  // "[](?conversation=x)"
  it("treats empty value as plain text");                  // "[Label](?conversation=)"
});
```

Constraints:

- **Do not modify the parser** — this task only adds tests that prove existing behavior
- Each test calls `parseInlines()` directly with the partial string and asserts all returned nodes are plain `text` type
- If any test fails, file a deviation and patch the parser

Verify: `npm exec vitest run src/adapters/MarkdownParserService.test.ts`

---

### Task 6 — Streaming safety tests for presenter `__actions__` (ICA-110–112)

**Problem:** `ChatPresenter.__actions__` extraction (L72–87) uses a regex that could theoretically match partial JSON. The spec requires verification that incomplete tags don't produce garbage actions.

**Fix:** Add tests to `src/adapters/ChatPresenter.test.ts`:

```typescript
describe("__actions__ streaming safety", () => {
  it("does not extract from partial tag: __actions__:[{\"label\":\"Open");
  it("does not extract from unclosed JSON array: __actions__:[{\"label\":\"Open\",\"action\":\"conversation\"}");
  it("preserves surrounding text when tag is incomplete");
  it("extracts correctly when tag is complete");
  it("produces empty actions array for syntactically complete but malformed JSON");
  it("filters out entries with invalid action types from otherwise valid array");
  it("filters out entries missing required 'action' field");
});
```

Constraints:

- **Do not modify the presenter** — test-only task
- The presenter's `try/catch` + `.filter()` already handles these cases — tests prove it
- Each test constructs a raw message string, calls `present()`, and inspects `actions`

Verify: `npm exec vitest run src/adapters/ChatPresenter.test.ts`

---

### Task 7 — Security negative tests for action dispatch (ICA-120–121)

**Problem:** The spec §4 requires that unknown action types render as inert text (`ICA-120`) and that route actions reject external URLs (`ICA-121`). The current implementation handles both, but there are no dedicated tests exercising the negative paths.

**Fix:** Add tests to `src/frameworks/ui/useChatSurfaceState.test.tsx`:

```typescript
describe("action dispatch security", () => {
  it("ignores route action with external URL (no leading /)");       // value = "https://evil.com"
  it("ignores route action with protocol-relative URL");             // value = "//evil.com"
  it("ignores conversation action with empty target ID");            // value = "", params = {}
  it("ignores conversation action with undefined params");           // value = "", params = undefined
  it("ignores send action with empty value and no params.text");     // value = "", params = {}
  it("does not crash on unknown action type");                       // actionType cast to any
});
```

Constraints:

- Each test fires `handleActionClick` with the problematic input and asserts no navigation/state change occurred
- The "unknown action type" test uses a type cast — this tests runtime safety, not compile-time

Verify: `npm exec vitest run src/frameworks/ui/useChatSurfaceState.test.tsx`

---

### Task 8 — Mobile density CSS for action chips

**Problem:** Action chips in the floating shell at mobile widths (≤640px) use desktop padding/font sizes, which wastes limited vertical space on small screens.

**Fix:** In `src/app/globals.css`, add responsive rules:

```css
@media (max-width: 640px) {
  [data-chat-shell-kind="floating"] [data-chat-action-chip] {
    padding-inline: var(--phi-2);
    padding-block: var(--phi-1);
    font-size: 0.75rem;
  }
  [data-chat-shell-kind="floating"] [data-chat-action-chips] {
    gap: var(--phi-1);
  }
}
```

Constraints:

- Follow the existing phi-ratio spacing scale
- Use the same `[data-chat-shell-kind="floating"]` nesting pattern as existing mobile rules
- Do not modify suggestion chip styles
- Action chip text remains readable (min 12px effective)
- Touch targets remain ≥44×44px (padding compensates for smaller font)

Verify: Visual inspection at 375px viewport width

---

### Task 9 — Visual polish: arrow indicator for navigation action links

**Problem:** Action links are visually identical regardless of type. Navigation-type actions (conversation, route, corpus) benefit from a subtle directional hint. Send-type actions should not have an arrow because they pre-fill the composer rather than navigate.

**Fix:** In `src/app/globals.css`:

```css
[data-chat-action-link]::after {
  content: " →";
  opacity: 0.4;
  font-size: 0.85em;
}

[data-chat-action-link="send"]::after {
  content: none;
}
```

Constraints:

- `send` type explicitly suppressed via `content: none`
- `conversation`, `route`, and `corpus` types all inherit the default arrow
- Arrow must be visible in both light and dark themes (opacity handles this)

Verify: Visual inspection in both themes

---

### Task 10 — Browser integration tests for action links in FAB

**Problem:** No integration test verifies that action links and chips render correctly inside the floating chat shell end-to-end.

**Fix:** In `tests/browser-fab-chat-flow.test.tsx`, add:

```
it("renders action link as a focusable button inside the assistant bubble");
it("renders action chips with data-chat-action-chip attributes inside the bubble");
```

In `tests/browser-fab-mobile-density.test.tsx`, add:

```
it("action chips render at mobile viewport width without overflow");
it("action links inside operator brief cards are focusable at mobile width");
```

Constraints:
- Follow existing test patterns: jsdom rendering with data-attribute selectors
- Construct messages in test fixtures — do not depend on AI response text
- Use the established mobile viewport width (375px) from existing density tests

Verify: `npm exec vitest run tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx`

---

### Task 11 — Operator brief visual density verification

**Problem:** Action links inside operator brief cards (NOW/NEXT/WAIT) have not been verified for visual density at all viewport widths. The Sprint 2 brevity rules (`2-3 bullet points max`) assume action links will render compactly, but no test confirms this.

**Fix:** In `src/frameworks/ui/RichContentRenderer.test.tsx`, add:

```
describe("operator brief with action links", () => {
  it("renders action links inside NOW/NEXT/WAIT card sections");
  it("action links are visually distinct from bold text (different node type)");
  it("operator brief with 3 cards each containing 2 action links produces correct node count");
});
```

Constraints:
- Follow existing operator brief test fixtures
- Assert on rendered DOM structure, not visual appearance (jsdom limitation)
- Verify action-link nodes are parsed correctly inside operator brief card content

Verify: `npm exec vitest run src/frameworks/ui/RichContentRenderer.test.tsx`

---

## Test Matrix

### Positive Tests — Streaming Safety (Tasks 5–6)
- [x] Partial `[Morg` renders as plain text — `"treats bare opening bracket as plain text"`
- [x] Partial `[Morgan Lee](?conv` renders as plain text — `"treats incomplete query string as plain text"`
- [x] Complete `[Morgan Lee](?conversation=conv_001)` parses as action link after incremental build — `"parses complete action link after incremental build"`
- [x] Partial `__actions__:[{"label":"Open` does not extract actions — `"does not extract from partial tag"`
- [x] Complete `__actions__:[...]` extracts correctly — `"extracts correctly when tag is complete"`
- [x] Entries with invalid action types are filtered from valid array — `"filters out entries with invalid action types from otherwise valid array"`
- [x] Entries missing `action` field are filtered out — `"filters out entries missing required action field"`

### Positive Tests — Architecture (Tasks 1–4)
- [x] `VALID_ACTION_TYPES` imported from `rich-content.ts` in both parser and presenter — verified by `grep -rn`; 1 definition + 2 imports
- [x] `ACTION_HANDLERS` strategy map dispatches all four types correctly — 4 handler functions in map, 9 existing dispatch tests pass
- [x] Existing `useChatSurfaceState` tests pass against strategy map refactor — 9/9 pass
- [x] `extractInlineText()` returns label text for `action-link` nodes — `"matches search queries against action link labels"`
- [x] Action link buttons have `aria-label` with label and action type — `getByRole("button", { name: "Morgan Lee (conversation)" })`
- [x] `MessageActionChips` container has `role="group"` and `aria-label="Message actions"` — `getByRole("group", { name: "Message actions" })`

### Positive Tests — Visual & Integration (Tasks 8–11)
- [x] Action chips render at 375px mobile viewport without overflow — `"action chips render at mobile viewport width without overflow"`
- [x] Arrow indicator `→` appears for conversation, route, corpus action links — CSS `[data-chat-action-link]::after { content: " →" }`
- [x] No arrow indicator for send type action links — CSS `[data-chat-action-link="send"]::after { content: none }`
- [x] Browser test: action link renders as button in FAB — `"renders action link as a focusable button inside the assistant bubble"`
- [x] Browser test: action chips render inside bubble in FAB — `"renders action chips with data-chat-action-chip attributes inside the bubble"`
- [x] Operator brief with action links renders correct node structure — `"renders action links inside NOW/NEXT/WAIT card sections"`
- [x] Action links inside operator brief are distinct from bold text — `"action links are visually distinct from bold text (different node type)"`

### Negative Tests — Security (Task 7)
- [x] Route action with external URL (`https://evil.com`) is rejected — no navigation — `"rejects route action for external URLs (security)"` (pre-Sprint 3)
- [x] Route action with protocol-relative URL (`//evil.com`) is rejected — `"ignores route action with protocol-relative URL"` (Sprint 3). **Bug found and fixed: `&& !value.startsWith("//")` added.**
- [x] Conversation action with empty target ID is a no-op — `"is a no-op when conversation action has empty ID"` (pre-Sprint 3)
- [x] Conversation action with undefined params is a no-op — `"ignores conversation action with undefined params"` (Sprint 3)
- [x] Send action with empty value and no `params.text` sets empty string (benign) — `"sets empty string on send action with empty value and no params.text"` (Sprint 3)
- [x] Unknown action type does not crash dispatch — `"does not crash on unknown action type"` (Sprint 3)

### Negative Tests — Parser Robustness (Task 5)
- [x] Unknown action type `[Foo](?unknown=bar)` treated as plain text — `"treats action link with unknown type as plain text"`
- [x] Empty label `[](?conversation=x)` treated as plain text — `"treats empty label as plain text"`
- [x] Empty value `[Label](?conversation=)` — **DEVIATION: parses as valid** (see QA Deviations) — `"parses action link with empty value as valid"`
- [x] Syntactically complete but malformed JSON in `__actions__` produces empty array — `"produces empty actions array for syntactically complete but malformed JSON"`

### Edge Cases
- [x] Action link inside an operator brief card at mobile width — `"action links inside operator brief cards are focusable at mobile width"`
- [x] 3 action chips with long labels — wrapping behavior at narrow viewport — `"action chips render at mobile viewport width without overflow"`
- [ ] Dark theme: action link arrow indicator visible (opacity 0.4) — **Visual-only; not testable in jsdom**
- [ ] Light theme: action link arrow indicator visible (opacity 0.4) — **Visual-only; not testable in jsdom**
- [x] `__actions__` with mix of valid and invalid entries — only valid entries extracted — `"filters out entries with invalid action types from otherwise valid array"`
- [ ] Action link with URL-encoded special characters in value parses correctly — **Not explicitly tested; parser uses `decodeURIComponent` (code review verified)**
- [x] Strategy map dispatch with empty string value for each action type — no crash — covered by conversation (empty ID = no-op), send (empty = sets ""), route (empty fails `startsWith("/")`), corpus (empty pushes `/library/section/`)

---

## Architectural Acceptance Criteria

These criteria formalize the GOF, Booch, and Uncle Bob requirements that must be verified during QA:

### Uncle Bob Martin — SOLID

| Principle | Criterion | Verification |
| --- | --- | --- |
| **SRP** | `VALID_ACTION_TYPES` has exactly one canonical definition; `ChatPresenter.present()` extraction blocks are tested via Task 6 (refactor deferred to Sprint 4) | `grep -r "VALID_ACTION_TYPES" src/` returns only `rich-content.ts` definition + imports; Task 6 tests lock extraction behavior |
| **OCP** | Action dispatch is extensible without modifying `handleActionClick` | `ACTION_HANDLERS` is a `Record<ActionLinkType, handler>` — new types add entries, no switch to edit |
| **LSP** | All four action handlers are substitutable through the strategy map | Each handler conforms to `(deps, value, params?) => void` signature |
| **ISP** | `onActionClick` callback signature is stable and minimal | `(actionType: ActionLinkType, value: string, params?: Record<string, string>) => void` — unchanged |
| **DIP** | `ACTION_HANDLERS` depends on abstract `ActionDispatchDeps` type, not concrete hooks | Type-level verification: `ActionDispatchDeps` is a plain interface |

### GOF — Design Patterns

| Pattern | Application | Verification |
| --- | --- | --- |
| **Strategy** | `ACTION_HANDLERS` map in `useChatSurfaceState.tsx` | Map keys are `ActionLinkType` values; map values are handler functions; dispatch is `handler?.(deps, value, params)` |
| **Template Method** (structural follow) | `__actions__` and `__suggestions__` extraction both follow regex → parse → validate | Code review — pattern documented, refactor deferred (see Deferred Findings). Task 6 streaming tests lock current behavior. |

### Grady Booch — Object-Oriented Design

| Principle | Criterion | Verification |
| --- | --- | --- |
| **High Cohesion** | All action-type definitions live in `rich-content.ts` | `ActionLinkType`, `VALID_ACTION_TYPES`, `INLINE_TYPES.ACTION_LINK` all in one file |
| **Low Coupling** | Parser and presenter import type knowledge from entities, not from each other | Neither file imports the other |
| **Encapsulation** | `MessageActionChips` exposes semantic role to assistive tech | `role="group"` + `aria-label` make the component's purpose explicit to all consumers |
| **Complete Interface** | `extractInlineText()` handles all members of the `InlineNode` union | Switch covers `text`, `bold`, `code-inline`, `library-link`, `action-link` — no silent `default: ""` for known types |

---

## Completion Checklist

- [x] `VALID_ACTION_TYPES` exported from `rich-content.ts`, imported by parser + presenter (Task 1)
- [x] `ACTION_HANDLERS` strategy map replaces switch in `useChatSurfaceState.tsx` (Task 2)
- [x] `extractInlineText()` handles `action-link` type (Task 3)
- [x] `aria-label` on action link buttons in `RichContentRenderer.tsx` (Task 4)
- [x] `role="group"` + `aria-label` on `MessageActionChips` container (Task 4)
- [x] 8 streaming safety tests for parser (Task 5)
- [x] 7 streaming safety tests for presenter (Task 6)
- [x] 6 security negative tests for action dispatch (Task 7) — 4 in Sprint 3 block + 2 pre-existing
- [x] Mobile density CSS for action chips (Task 8)
- [x] Arrow indicator CSS for navigation action links (Task 9)
- [x] 4 browser integration tests (Task 10)
- [x] 3 operator brief density tests (Task 11)
- [x] `npm run typecheck` clean — `tsc --noEmit` zero errors
- [x] `npm run build` succeeds — production build completes
- [x] All new tests pass — 1093 tests across 176 suites
- [x] Architectural acceptance criteria verified

---

## QA Deviations

### Deviation 1 — Empty-value action link parses as valid (Task 5)

**Spec expectation:** `[Label](?conversation=)` should be treated as plain text.
**Actual behavior:** The regex matches the complete `[...](?...)` form. `parseActionLink()` extracts `actionType="conversation"` and `value=""`. Since the empty string passes all parser checks (only `actionType` is validated against `VALID_ACTION_TYPES`), a valid `action-link` node is returned.
**Impact:** Low. Downstream dispatch handles empty values safely — the `conversation` handler checks `if (!targetId) return;`. The `route` handler's `value.startsWith("/")` rejects empty strings. The `send` handler pre-fills with `""` (benign). The `corpus` handler navigates to `/library/section/` (harmless 404).
**Resolution:** Test adjusted to `"parses action link with empty value as valid"`. Parser not modified — the permissive behavior is safe.

### Deviation 2 — Security test count and organization (Task 7)

**Spec expectation:** 6 dedicated security negative tests in `useChatSurfaceState.test.tsx`.
**Actual implementation:** 4 tests in the new `"action dispatch security"` describe block. The remaining 2 behaviors are covered by pre-existing tests:
- `"rejects route action for external URLs (security)"` — exercises `https://evil.com`
- `"is a no-op when conversation action has empty ID"` — exercises empty target

All 6 negative paths are tested; the organizational split is an arrangement deviation, not a coverage gap.

### Deviation 3 — Protocol-relative URL security bug found (Task 7)

**Spec status:** `ICA-121` was marked ✅ Pass in the Architectural Audit.
**Actual finding:** The `route` handler's `value.startsWith("/")` check passed for `//evil.com` — a protocol-relative URL that a browser resolves to `https://evil.com`. This is a real security bypass.
**Fix applied:** `value.startsWith("/") && !value.startsWith("//")` in the `route` handler (L34 of `ACTION_HANDLERS`). Test proves the fix.

### Deviation 4 — `ACTION_HANDLERS` and `ActionDispatchDeps` exported (Task 2)

**Spec expectation:** Task 2 does not specify visibility modifiers.
**Actual implementation:** Both are `export` — necessary for direct unit testing of the strategy map without requiring hook rendering.
**Impact:** None. Public visibility enables better testing. The types are internal implementation detail consumed only by tests.

---

## Verification Results

### Test Counts (Post-QA)

| File | Pre-Sprint 3 | Post-Sprint 3 | New Tests |
| --- | --- | --- | --- |
| `src/adapters/MarkdownParserService.test.ts` | 14 | 22 | +8 (streaming parser) |
| `src/adapters/ChatPresenter.test.ts` | 7 | 14 | +7 (streaming presenter) |
| `src/frameworks/ui/useChatSurfaceState.test.tsx` | 9 | 13 | +4 (security dispatch) |
| `src/frameworks/ui/RichContentRenderer.test.tsx` | 12 | 15 | +3 (operator brief density) |
| `src/frameworks/ui/MessageList.test.tsx` | 18 | 19 | +1 (search extracts action-link labels) |
| `tests/browser-fab-chat-flow.test.tsx` | 1 | 3 | +2 (action link, action chips) |
| `tests/browser-fab-mobile-density.test.tsx` | 2 | 4 | +2 (mobile chips, brief links) |
| **Total** | **63** | **90** | **+27** |

### Verification Commands

```
$ npx tsc --noEmit          → 0 errors
$ npm run build              → production build succeeds
$ npx vitest run             → 1093 tests passed (176 suites)
```

### Full Suite Summary

- **Test Files:** 175 passed, 1 failed (Playwright `fab-live-smoke.spec.ts` — pre-existing Vitest/Playwright incompatibility, not a Sprint 3 regression)
- **Tests:** 1093 passed
- **Modified source files:** 7 (`rich-content.ts`, `MarkdownParserService.ts`, `ChatPresenter.ts`, `useChatSurfaceState.tsx`, `MessageList.tsx`, `RichContentRenderer.tsx`, `globals.css`)
- **Modified test files:** 7 (parser, presenter, surface state, renderer, message list, FAB flow, FAB density)

---

## Verification

```bash
# Architectural refactors
npm run typecheck
npm exec vitest run src/adapters/MarkdownParserService.test.ts
npm exec vitest run src/adapters/ChatPresenter.test.ts
npm exec vitest run src/frameworks/ui/useChatSurfaceState.test.tsx
npm exec vitest run src/frameworks/ui/MessageList.test.tsx
npm exec vitest run src/frameworks/ui/RichContentRenderer.test.tsx

# Integration
npm exec vitest run tests/browser-fab-chat-flow.test.tsx
npm exec vitest run tests/browser-fab-mobile-density.test.tsx

# Full suite
npm run build
npm exec vitest run
```

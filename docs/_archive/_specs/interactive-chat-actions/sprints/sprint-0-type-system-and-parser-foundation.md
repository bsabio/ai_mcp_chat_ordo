# Sprint 0 — Type System And Parser Foundation

> **Goal:** Add `action-link` to the inline type system, add `MessageAction` to the presenter, extend the markdown parser to recognize action link syntax, extend the presenter to extract `__actions__`, and ship unit tests for both.
> **Spec Sections:** `ICA-050` through `ICA-078`

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/core/entities/rich-content.ts` | Exports `INLINE_TYPES` (TEXT, BOLD, CODE, LINK), `BLOCK_TYPES`, `InlineNode` union (4 variants), `BlockNode` union (10 variants), `RichContent` interface |
| `src/adapters/MarkdownParserService.ts` | `class MarkdownParserService { parse(markdown: string): RichContent }`. Private `parseInlines(text: string): InlineNode[]` uses combined regex `/(\*\*[^*]+\*\*\|\`[^\`]+\`\|\[\[[^\]]+\]\])/g` |
| `src/adapters/ChatPresenter.ts` | `class ChatPresenter { present(message: ChatMessage): PresentedMessage }`. Extracts `__suggestions__` via `/__suggestions__:\[([\s\S]*?)\]/`. `PresentedMessage` has: id, role, content, rawContent, commands, suggestions, attachments, timestamp |
| `src/adapters/MarkdownParserService.test.ts` | 7 tests: paragraph, inlines (bold/code/links), headings, lists, code blocks, tables, operator briefs |
| `src/adapters/ChatPresenter.test.ts` | 1 test: basic message transformation with mock parser and command parser |

---

## Tasks

### 1. Add `ACTION_LINK` to `INLINE_TYPES` and extend `InlineNode`

In `src/core/entities/rich-content.ts`:

- Add `ACTION_LINK: "action-link"` to `INLINE_TYPES`
- Export a new `ActionLinkType` union: `"conversation" | "route" | "send" | "corpus"`
- Add a new variant to `InlineNode`: `{ type: typeof INLINE_TYPES.ACTION_LINK; label: string; actionType: ActionLinkType; value: string; params?: Record<string, string> }`

Constraints:

- Do not modify any existing `InlineNode` variants
- Do not modify `BLOCK_TYPES` or `BlockNode`

Verify: `npm run typecheck`

### 2. Export `MessageAction` interface and add `actions` to `PresentedMessage`

In `src/adapters/ChatPresenter.ts`:

- Import `ActionLinkType` from `rich-content.ts`
- Export a new interface:

  ```typescript
  export interface MessageAction {
    label: string;
    action: ActionLinkType;
    params: Record<string, string>;
  }
  ```

- Add `actions: MessageAction[]` to `PresentedMessage`
- Initialize `actions` as `[]` in `present()` and populate from `__actions__` extraction (Task 4)
- Include `actions` in the return value

Constraints:

- Do not remove or rename existing `PresentedMessage` fields
- Default to empty array so existing code that doesn't use `actions` is unaffected

Verify: `npm run typecheck`

### 3. Extend `parseInlines()` to recognize action link syntax

In `src/adapters/MarkdownParserService.ts`:

- Update the combined regex in `parseInlines()` to add a new alternation for action links:

  ```text
  \[[^\]]+\]\(\?[^)]+\)
  ```

  Full combined regex becomes:

  ```typescript
  const combined = /(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\]|\[[^\]]+\]\(\?[^)]+\))/g;
  ```
- Add a new branch in the match handler for patterns starting with `[` (but not `[[`):
  - Extract label from `[label]`
  - Extract the query string from `(?action=value&key=value)`
  - Parse action type as the first param name, value as the first param value
  - Apply `decodeURIComponent()` to the value and to each additional param value (the spec grammar defines values as URL-encoded strings, and the AI may emit `+` for spaces or `%26` for `&`)
  - Parse any additional `&key=value` pairs into `params`
  - Emit `{ type: INLINE_TYPES.ACTION_LINK, label, actionType, value, params }`

Constraints:

- The regex must not match plain markdown links `[text](https://...)` — the `?` prefix is the discriminator
- Partial sequences during streaming (e.g., `[Morg` or `[Morgan Lee](?conv`) must fall through as plain text
- Malformed action links must be handled defensively: `[text](?)`, `[text](?=broken)`, or unknown action types (e.g., `[text](?unknown=value)`) must be emitted as plain text nodes rather than crashing the parser
- Do not modify existing bold, code, or library-link handling

Verify: `npm exec vitest run src/adapters/MarkdownParserService.test.ts`

### 4. Extract `__actions__` in `ChatPresenter.present()`

In `src/adapters/ChatPresenter.ts`:

- Add `ACTION_REGEX` constant: `/__actions__:\[([\s\S]*?)\]/`
- In `present()`, after suggestion extraction but before markdown parsing:
  - Match `ACTION_REGEX` against `textContent`
  - Parse matched JSON into `MessageAction[]`
  - Remove the `__actions__` tag from `textContent`
  - Validate each action has valid `action` type (conversation | route | send | corpus)
  - Discard entries with unknown action types
- Assign the parsed array to the returned `PresentedMessage.actions`

Constraints:

- `__actions__` and `__suggestions__` extraction are independent — both can appear in the same message
- Malformed JSON silently produces an empty array (same pattern as suggestions)
- The `[\s\S]*?` non-greedy quantifier stops at the first `]`. Action param values must not contain literal `]` characters (acceptable because params are short identifiers). Add a code comment above `ACTION_REGEX` documenting this constraint.
- The tag must be fully removed from text content before markdown parsing

Verify: `npm exec vitest run src/adapters/ChatPresenter.test.ts`

### 5. Unit tests for action link parsing

In `src/adapters/MarkdownParserService.test.ts`, add tests:

1. Parse a simple action link: `[Morgan Lee](?conversation=conv_001)` → `{ type: "action-link", label: "Morgan Lee", actionType: "conversation", value: "conv_001" }`
2. Parse action link with additional params: `[Send offer](?send=Draft+offer&tone=formal)` → `actionType: "send"`, `value: "Draft offer"`, `params: { tone: "formal" }`
3. Parse action link alongside bold and code: `**Name:** [Morgan](?conversation=c1) with \`code\`` → all three types present
4. Parse action link inside a list item
5. Parse action link inside an operator brief section
6. Partial action link `[Morgan` renders as plain text
7. Standard markdown link `[text](https://example.com)` is NOT parsed as action link (no `?` prefix)

### 6. Unit tests for `__actions__` extraction

In `src/adapters/ChatPresenter.test.ts`, add tests:

1. Extract actions from a message with `__actions__` tag
2. Verify `__actions__` tag is removed from the text content passed to the markdown parser (not from `rawContent` — `rawContent` preserves the original message)
3. Both `__actions__` and `__suggestions__` extracted from same message
4. Malformed `__actions__` JSON produces empty array
5. Unknown action types are filtered out
6. Message without `__actions__` has empty actions array

---

## Test Matrix

### Positive Tests

- [ ] Action link parsed from inline text with correct type, label, value, params
- [ ] Action link with URL-encoded value decoded correctly
- [ ] Action link coexists with bold, code, library-link in same paragraph
- [ ] Action link parsed inside list items
- [ ] Action link parsed inside operator brief section items
- [ ] `__actions__` extracted with correct label, action, params
- [ ] `__actions__` tag removed from text content before markdown parsing (but `rawContent` preserves original)
- [ ] Both `__actions__` and `__suggestions__` extracted from same message
- [ ] `PresentedMessage.actions` defaults to empty array

### Negative Tests

- [ ] Partial action link `[Morgan` renders as plain text
- [ ] Standard markdown link `[text](https://...)` not parsed as action link
- [ ] Malformed `__actions__` JSON → empty array, no throw
- [ ] Unknown action type in `__actions__` → entry filtered out
- [ ] Empty `__actions__` tag → empty array

### Edge Cases

- [ ] Action link label containing special characters (parentheses, brackets)
- [ ] Action link value containing `&` in URL-encoded form
- [ ] Multiple action links in the same paragraph
- [ ] `__actions__` with single-item array
- [ ] `__actions__` tag appears mid-message (not at end)
- [ ] Malformed action link `[text](?)` → plain text
- [ ] Malformed action link `[text](?=broken)` → plain text (no action type before `=`)
- [ ] Unknown action type `[text](?unknown=value)` → plain text
- [ ] `__actions__` with `]` in a JSON string value → truncated match, empty array (documented limitation)

---

## Completion Checklist

- [ ] `INLINE_TYPES.ACTION_LINK` and `ActionLinkType` exported from `rich-content.ts`
- [ ] `InlineNode` union extended with action-link variant
- [ ] `MessageAction` interface exported from `ChatPresenter.ts`
- [ ] `PresentedMessage.actions` field added and defaults to `[]`
- [ ] `parseInlines()` regex extended and action links parsed
- [ ] `present()` extracts and removes `__actions__` tag
- [ ] MarkdownParserService tests pass (existing 7 + new ~7 = ~14)
- [ ] ChatPresenter tests pass (existing 1 + new ~6 = ~7)
- [ ] `npm run typecheck` clean
- [ ] `npm run build` succeeds

---

## QA Deviations

*To be filled during implementation.*

---

## Verification Results

*To be filled during implementation.*

---

## Verification

```bash
npm exec vitest run src/adapters/MarkdownParserService.test.ts
npm exec vitest run src/adapters/ChatPresenter.test.ts
npm run typecheck
npm run build
```

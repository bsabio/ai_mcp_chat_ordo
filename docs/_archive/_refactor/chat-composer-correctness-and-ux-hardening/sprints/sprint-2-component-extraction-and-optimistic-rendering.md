# Sprint 2 — Component Extraction And Optimistic Rendering

> **Status:** Planned
> **Source:** `docs/_refactor/chat-composer-correctness-and-ux-hardening/spec.md`
> **Spec refs:** `CCH-015`, `CCH-016`, `CCH-104`, `CCH-105`, `CCH-112`
> **Prerequisite:** Sprint 0 and Sprint 1 completed

---

## Objective

Decompose the ChatInput god-component into focused, testable sub-components; eliminate the remaining prop-drilling weight; and add optimistic message rendering so the user never stares at a void between pressing Send and seeing their message appear. `[CCH-S2-010]`

When this sprint lands, ChatInput goes from 22 props and 5 responsibilities to ~12 props and 2 responsibilities (text editing and keyboard dispatch). Every other concern owns its own component with its own test surface.

---

## Available Assets

| File | Role in this sprint |
|---|---|
| `src/frameworks/ui/ChatInput.tsx` | Decomposition target — extract file pills and send control |
| `src/frameworks/ui/ChatContentSurface.tsx` | Wiring target — new sub-component props |
| `src/frameworks/ui/useChatSurfaceState.tsx` | Already cleaned in Sprint 0 — verify no new duplication introduced |
| `src/hooks/chat/useChatComposerController.ts` | Reference only — no changes expected |
| `src/hooks/useGlobalChat.tsx` | Optimistic rendering integration point |
| `src/hooks/usePresentedChatMessages.ts` | Optimistic message reconciliation |
| `src/adapters/ChatPresenter.ts` | PresentedMessage type — may need `status` field |
| `src/app/styles/chat.css` | Pending message opacity styling |

---

## Task 2.1 — Extract ComposerFilePills

**Spec ref:** `CCH-104`
**New file:** `src/frameworks/ui/ComposerFilePills.tsx`
**Test refs:** `CCH-T370`, `CCH-T375`, `CCH-T380`

### Interface design

```tsx
interface ComposerFilePillsProps {
  files: File[];
  onRemove: (index: number) => void;
}
```

That's it. Two props. `[CCH-S2-020]`

### Architecture

1. Create `src/frameworks/ui/ComposerFilePills.tsx` as a new file. `[CCH-S2-021]`

2. Move the entire file-pills rendering block from ChatInput into this component. This includes:
   - The outer wrapping `<div>` with `data-chat-file-pills="true"`
   - The `pendingFiles.map(...)` loop
   - The thumbnail logic (`getPreviewUrl`, `filePreviewUrls` ref, icons) added in Sprint 1
   - The `handleLocalFileRemove` wrapper that revokes object URLs
   - The cleanup `useEffect` for revoking URLs on unmount
   `[CCH-S2-022]`

3. The component renders `null` when `files.length === 0`. No empty wrapper in the DOM. `[CCH-S2-023]`

4. The outer wrapper has `data-chat-file-pills="true"` for CSS and test targeting. `[CCH-S2-024]`

### Exact component structure

```tsx
"use client";

import React, { useCallback, useEffect, useRef } from "react";

interface ComposerFilePillsProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function ComposerFilePills({ files, onRemove }: ComposerFilePillsProps) {
  const previewUrls = useRef<Map<File, string>>(new Map());

  const getPreviewUrl = useCallback((file: File): string | null => {
    if (!file.type.startsWith("image/")) return null;
    const existing = previewUrls.current.get(file);
    if (existing) return existing;
    const url = URL.createObjectURL(file);
    previewUrls.current.set(file, url);
    return url;
  }, []);

  const handleRemove = useCallback(
    (index: number) => {
      const file = files[index];
      if (file) {
        const url = previewUrls.current.get(file);
        if (url) {
          URL.revokeObjectURL(url);
          previewUrls.current.delete(file);
        }
      }
      onRemove(index);
    },
    [files, onRemove],
  );

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  if (files.length === 0) return null;

  return (
    <div
      className="mb-(--space-3) flex flex-wrap gap-(--space-2)"
      data-chat-file-pills="true"
    >
      {files.map((file, i) => {
        const previewUrl = getPreviewUrl(file);
        const icon =
          file.type === "application/pdf" ? "📄" :
          file.type === "text/plain" ? "📝" :
          null;

        return (
          <div
            key={i}
            className="ui-chat-file-pill flex items-center gap-(--space-2) rounded-full px-(--space-3) py-(--space-2) text-[11px] font-medium"
            title={file.name}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
            ) : icon ? (
              <span className="shrink-0 text-sm" aria-hidden="true">{icon}</span>
            ) : null}
            <span className="max-w-30 truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="focus-ring rounded-full p-(--space-1) text-foreground/56 transition-colors hover:text-red-500"
              aria-label={`Remove ${file.name}`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

### Integration with ChatInput

5. Remove the file-pills rendering block from `ChatInput.tsx`. `[CCH-S2-025]`
6. Remove the `filePreviewUrls` ref, `getPreviewUrl`, `handleLocalFileRemove`, and the cleanup `useEffect` from ChatInput (all moved to ComposerFilePills). `[CCH-S2-026]`
7. Import and render `<ComposerFilePills>` above the composer form:
   ```tsx
   <div className="mx-auto max-w-3xl">
     <ComposerFilePills files={pendingFiles} onRemove={onFileRemove} />
     <form ...>
   ```
   `[CCH-S2-027]`

### Test plan — `tests/composer-file-pills.test.tsx`

| Test ID | Scenario | Assertion |
|---|---|---|
| `CCH-T370` | Render with 2 files | `data-chat-file-pills="true"` wrapper exists; 2 pills render |
| `CCH-T375` | Render with 0 files | No `data-chat-file-pills` element in DOM |
| `CCH-T380` | Remove file while mentions menu is open (parent test) | MentionsMenu stays open; focus returns to textarea |

---

## Task 2.2 — Extract ComposerSendControl

**Spec ref:** `CCH-104`
**New file:** `src/frameworks/ui/ComposerSendControl.tsx`
**Test refs:** `CCH-T371`, `CCH-T372`

### Interface design

```tsx
interface ComposerSendControlProps {
  canSend: boolean;
  hasContent: boolean;
  isSending: boolean;
  canStopStream: boolean;
  onStopStream?: () => void | Promise<unknown>;
}
```

Five props. `[CCH-S2-030]`

### Architecture

1. Create `src/frameworks/ui/ComposerSendControl.tsx`. `[CCH-S2-031]`

2. Move from ChatInput:
   - The `sendButtonClassName` computation
   - The `stopButtonClassName` computation
   - The `showStopButton` derivation
   - The entire send/stop button `{showStopButton ? ... : ...}` conditional block
   `[CCH-S2-032]`

3. The component is a `<>` fragment returning either the stop button or the send button. It does not wrap in an extra `<div>`. `[CCH-S2-033]`

4. `hasContent` replaces the old `hasInput` for driving `data-chat-send-state` and the CSS class. This was already corrected in Sprint 0; this extraction preserves that fix. `[CCH-S2-034]`

### Exact component structure

```tsx
import React from "react";

interface ComposerSendControlProps {
  canSend: boolean;
  hasContent: boolean;
  isSending: boolean;
  canStopStream: boolean;
  onStopStream?: () => void | Promise<unknown>;
}

export function ComposerSendControl({
  canSend,
  hasContent,
  isSending,
  canStopStream,
  onStopStream,
}: ComposerSendControlProps) {
  const showStopButton = canStopStream && typeof onStopStream === "function";

  const sendButtonClassName = [
    "ui-chat-send-button focus-ring flex min-h-11 shrink-0 items-center justify-center gap-(--space-2) self-center rounded-(--fva-shell-radius-control) px-(--chat-composer-button-padding-inline) py-(--chat-composer-button-padding-block) text-sm font-semibold transition-all duration-300 active:scale-95",
    hasContent ? "ui-chat-send-ready" : "ui-chat-send-idle",
    !canSend && hasContent ? "ui-chat-send-disabled" : "",
  ].join(" ");

  const stopButtonClassName =
    "ui-chat-stop-button focus-ring flex min-h-11 shrink-0 items-center justify-center gap-(--space-2) self-center rounded-(--fva-shell-radius-control) border border-[color:color-mix(in_srgb,var(--danger,#b42318)_26%,transparent)] bg-[color:color-mix(in_srgb,var(--danger,#b42318)_10%,var(--surface))] px-(--chat-composer-button-padding-inline) py-(--chat-composer-button-padding-block) text-sm font-semibold text-[color:var(--danger,#b42318)] transition-all duration-300 hover:bg-[color:color-mix(in_srgb,var(--danger,#b42318)_14%,var(--surface))] active:scale-95";

  if (showStopButton) {
    return (
      <button
        type="button"
        onClick={() => { void onStopStream?.(); }}
        className={stopButtonClassName}
        aria-label="Stop generation"
        data-chat-stop-state="active"
      >
        <span data-chat-stop-label="true">Stop</span>
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={!canSend}
      data-chat-send-state={hasContent ? "ready" : "idle"}
      className={sendButtonClassName}
      aria-label={isSending ? "Sending message" : "Send"}
    >
      {isSending ? (
        <span className="flex gap-(--space-1)">
          <span className="w-(--space-2) h-(--space-2) bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-(--space-2) h-(--space-2) bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-(--space-2) h-(--space-2) bg-current rounded-full animate-bounce" />
        </span>
      ) : (
        <>
          <span data-chat-send-label="true">Send</span>
          <span data-chat-send-icon="true" aria-hidden="true" className="hidden">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h13" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </>
      )}
    </button>
  );
}
```

### Integration with ChatInput

5. Remove the `sendButtonClassName`, `stopButtonClassName`, `showStopButton` computations from ChatInput. `[CCH-S2-035]`
6. Remove the entire send/stop conditional block from the form. `[CCH-S2-036]`
7. Render `<ComposerSendControl>` inside the form where the buttons were:
   ```tsx
   <ComposerSendControl
     canSend={canSend}
     hasContent={hasContent}
     isSending={isSending}
     canStopStream={canStopStream ?? false}
     onStopStream={onStopStream}
   />
   ```
   `[CCH-S2-037]`

### Test plan — `tests/composer-send-control.test.tsx`

| Test ID | Scenario | Assertion |
|---|---|---|
| `CCH-T371a` | Render with `canStopStream=true`, `onStopStream` | Stop button renders with `data-chat-stop-state="active"` |
| `CCH-T371b` | Click stop button | `onStopStream` called once |
| `CCH-T372a` | Render with `hasContent=true`, `canSend=true` | Send button has `data-chat-send-state="ready"`, class includes `ui-chat-send-ready` |
| `CCH-T372b` | Render with `hasContent=false` | Send button has `data-chat-send-state="idle"`, class includes `ui-chat-send-idle` |
| `CCH-T372c` | Render with `hasContent=true`, `canSend=false` | Send button has class `ui-chat-send-disabled` |
| `CCH-T372d` | Render with `isSending=true`, no stop | Send button has `aria-label="Sending message"`, loading dots render |

---

## Task 2.3 — ChatInput Post-Extraction Verification

**File:** `src/frameworks/ui/ChatInput.tsx`

After extraction, verify the slimmed-down ChatInput.

### Final ChatInput prop count

Before: 22 props. After:

```tsx
interface ChatInputProps {
  // Core textarea control
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  maxTextareaHeight?: number;
  placeholderText?: string;
  value: string;
  onChange: (val: string, selectionStart: number) => void;
  onSend: () => void;
  isSending: boolean;

  // Mentions coordination
  activeTrigger: string | null;
  suggestions: MentionItem[];
  mentionIndex: number;
  onMentionIndexChange: (index: number) => void;
  onSuggestionSelect: (item: MentionItem) => void;

  // Sub-component rendering (composed, not drilled)
  pendingFiles: File[];
  onFileRemove: (index: number) => void;
  canSend: boolean;
  canStopStream?: boolean;
  onStopStream?: () => void | Promise<unknown>;
  onFileDrop: (event: React.DragEvent) => void;
  sendError: string | null;

  // File input (button trigger only — the hidden input)
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
```

Target: **21 props** (down from 22 — modest reduction). The real win is the **responsibility reduction**: ChatInput no longer owns button styling logic, file pill rendering, or object URL lifecycle. Those are in dedicated components. `[CCH-S2-040]`

### Structural verification

1. `data-chat-composer-form`, `data-chat-composer-state`, `data-chat-composer-field`, `data-chat-send-state`, `data-chat-stop-state` — all still emitted, now some via sub-components. The CSS selectors match the same attributes. `[CCH-S2-041]`
2. ChatInput still owns: textarea, keyboard dispatch (`handleKeyDown`), MentionsMenu rendering, attach button, hidden file input, form `onSubmit`, and the drag-drop zone. `[CCH-S2-042]`
3. ChatInput does NOT own: file pill rendering, object URL lifecycle, send/stop button internals. `[CCH-S2-043]`

### Test plan

Run the existing `ChatInput.test.tsx` — all tests must still pass. The extraction should be invisible to the existing test surface because tests interact via the form, textarea, and buttons — not via internal implementation details.

---

## Task 2.4 — Optimistic Message Rendering

**Spec ref:** `CCH-024`, `CCH-112`
**Files:** `useGlobalChat.tsx`, `usePresentedChatMessages.ts`, `ChatPresenter.ts` (or equivalent adapter), `ChatInput.tsx` (for message styling)
**Test refs:** `CCH-T400` through `CCH-T412`

### Design philosophy

Optimistic rendering is the single highest-impact UX improvement this sprint delivers. The user's message should appear in the viewport the instant they press Send — not when the server acknowledges receipt. This eliminates the "text vanishes → brief void → message appears" lag that makes the product feel slower than the runtime actually is.

### Architecture — pending message model

1. Extend `PresentedMessage` (or create a wrapper) with a `status` field:
   ```tsx
   type MessageStatus = "confirmed" | "pending" | "failed";
   ```
   Existing messages default to `"confirmed"`. `[CCH-S2-050]`

2. Add `data-chat-message-status` attribute to the message bubble rendering, driven by this status. `[CCH-S2-051]`

### Architecture — message lifecycle

3. In `useGlobalChat` (or the send path that feeds it), **before** calling the server:
   - Generate a local `nonce` (e.g., `crypto.randomUUID()`)
   - Insert a pending user message into the local messages array:
     ```tsx
     { role: "user", content: draft, nonce, status: "pending", files: queuedFiles }
     ```
   `[CCH-S2-052]`

4. When the server responds successfully:
   - Match the pending message by `nonce`
   - Replace it with the confirmed server message
   - Set `status: "confirmed"`
   `[CCH-S2-053]`

5. When the server responds with failure (or the request throws):
   - Match the pending message by `nonce`
   - Set `status: "failed"`
   - Render a retry affordance on the message itself
   `[CCH-S2-054]`

6. Multiple rapid sends: each gets its own `nonce`. They appear in chronological send order in the viewport, independent of server response order. `[CCH-S2-055]`

### Architecture — visual treatment

7. Pending messages use `opacity: 0.8` and no box-shadow (lighter than confirmed messages):
   ```css
   [data-chat-message-status="pending"] [data-chat-bubble-surface="true"] {
     opacity: 0.8;
     box-shadow: none;
   }
   ```
   `[CCH-S2-056]`

8. Failed messages show a red border tint and a "Retry" button:
   ```css
   [data-chat-message-status="failed"] [data-chat-bubble-surface="true"] {
     border-color: color-mix(in srgb, var(--danger, #b42318) 20%, transparent);
   }
   ```
   `[CCH-S2-057]`

9. The transition from `pending` → `confirmed` is a smooth opacity animation:
   ```css
   [data-chat-bubble-surface="true"] {
     transition: opacity 200ms ease;
   }
   ```
   `[CCH-S2-058]`

### Architecture — reconciliation rules

10. Pending messages are **local-only** — they are not written to the database. They live entirely in the React state of `useGlobalChat`. `[CCH-S2-059]`
11. If the user navigates away while a message is pending, the pending message is lost. This is expected — the server either received it (and it'll show when they return) or it didn't (and nothing was saved). `[CCH-S2-060]`
12. The `nonce` is never sent to the server. It's purely a local reconciliation key. `[CCH-S2-061]`

### Scope limitation

This sprint adds optimistic rendering for **user messages only**. The assistant response still appears when streaming begins. Optimistic assistant messages (e.g., a "thinking..." indicator) are out of scope. `[CCH-S2-062]`

### Test plan — `tests/optimistic-message-rendering.test.ts`

| Test ID | Scenario | Setup | Assertion |
|---|---|---|---|
| `CCH-T400` | User sends "Hello" | Mock `sendMessage` that resolves after 100ms | Pending message with text "Hello" appears immediately; has `status: "pending"` |
| `CCH-T401` | Server responds successfully | Promise resolves with `{ ok: true }` | Pending message replaced by confirmed; `status: "confirmed"` |
| `CCH-T405` | Server rejects | Promise resolves with `{ ok: false, error: "Rate limited" }` | Message transitions to `status: "failed"` |
| `CCH-T406` | User navigates away before response | Unmount component while pending | No error; pending message GC'd with React state |
| `CCH-T410` | User sends 3 messages rapidly | 3 `sendMessage` calls before any resolve | 3 pending messages appear in order |
| `CCH-T411` | Server responds out of order (msg 3 first, msg 1 last) | Resolve promises in reverse order | Messages maintain chronological send order in viewport |
| `CCH-T412` | Pending message has file attachments | Send text + files | Pending message shows inline file reference |

---

## Task 2.5 — Final Integration Verification

### Prop reduction audit

Count ChatInput props before and after:

| Metric | Before Sprint 2 | After Sprint 2 |
|---|---|---|
| ChatInput props | 22 | 21 |
| ChatInput responsibilities | 5 (text, files, mentions, keyboard, send/stop) | 3 (text + keyboard dispatch, mentions coordination, form + drag-drop zone) |
| Lines in ChatInput file | ~260 | ~160 (estimated) |
| Deepest prop drill (orchestrator → leaf) | 3 levels, 22 props at leaf | 3 levels, 21 props at leaf, but 2 sub-components handle their own logic |

The prop count reduction is modest because the parent still needs to pass data down. The real improvement is **responsibility distribution** — file pill lifecycle, send button state machines, and optimistic message reconciliation each have their own dedicated component or hook.

### Data attribute contract preservation

Every CSS selector in `chat.css` that targets `data-chat-*` must still match a rendered element. The sub-component extraction moves *which* component emits the attribute, but does not change the attribute's presence or value.

Verify by running:
```bash
npm exec vitest run tests/theme-governance-qa.test.ts
```

---

## Deliverables

1. `src/frameworks/ui/ComposerFilePills.tsx` — extracted file pill component with thumbnail lifecycle
2. `src/frameworks/ui/ComposerSendControl.tsx` — extracted send/stop button component
3. Slimmed ChatInput — text editing, keyboard dispatch, mentions, and form structure only
4. Optimistic message rendering with `pending`/`confirmed`/`failed` status lifecycle
5. `data-chat-message-status` attribute on message bubbles
6. CSS for pending (reduced opacity) and failed (red border tint) messages
7. New test files: `composer-file-pills.test.tsx`, `composer-send-control.test.tsx`, `optimistic-message-rendering.test.ts`

---

## Verify

```bash
npm run typecheck
npm run lint
npm exec vitest run
npm run build
```

---

## Exit Criteria

1. `ComposerFilePills` renders independently with 2 props. Verified by `CCH-T370`.
2. `ComposerFilePills` renders `null` when `files.length === 0`. Verified by `CCH-T375`.
3. `ComposerSendControl` renders stop button with correct attribute. Verified by `CCH-T371a`.
4. `ComposerSendControl` transitions through idle/ready/disabled states. Verified by `CCH-T372a–d`.
5. All existing ChatInput tests still pass after extraction.
6. Sending a message shows a pending bubble immediately. Verified by `CCH-T400`.
7. Server success replaces pending with confirmed. Verified by `CCH-T401`.
8. Server failure transitions to failed with retry affordance. Verified by `CCH-T405`.
9. 3 rapid sends produce 3 pending messages in order. Verified by `CCH-T410`.
10. All `data-chat-*` CSS selectors still match rendered elements.
11. Full vitest suite passes with zero failures.
12. `npm run build` succeeds.
13. `npm run lint` — zero errors.

---

## Completion Checklist

- [ ] `ComposerFilePills` created with 2-prop interface
- [ ] File pill rendering + thumbnail lifecycle moved from ChatInput to ComposerFilePills
- [ ] `ComposerSendControl` created with 5-prop interface
- [ ] Send/stop button logic moved from ChatInput to ComposerSendControl
- [ ] ChatInput stripped of file pill rendering, button styling, object URL management
- [ ] ChatInput imports and renders both sub-components
- [ ] All existing ChatInput tests pass unchanged
- [ ] `PresentedMessage` extended with `status: "confirmed" | "pending" | "failed"`
- [ ] Optimistic message inserted into local state on send
- [ ] Pending → confirmed reconciliation on server success
- [ ] Pending → failed reconciliation on server error
- [ ] `data-chat-message-status` attribute on message bubbles
- [ ] CSS: pending opacity 0.8, failed red border tint, smooth transition
- [ ] Multiple rapid sends produce correctly ordered pending messages
- [ ] Retry affordance on failed messages
- [ ] All new tests pass
- [ ] All existing tests pass
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` succeeds
- [ ] `npm run lint` — zero errors
- [ ] `data-chat-*` contract verified by governance tests

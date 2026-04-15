# Sprint 1 — UX Polish And Interaction Completeness

> **Status:** Planned
> **Source:** `docs/_refactor/chat-composer-correctness-and-ux-hardening/spec.md`
> **Spec refs:** `CCH-021` through `CCH-028`, `CCH-108` through `CCH-112`
> **Prerequisite:** Sprint 0 (correctness fixes and dead code removal) completed

---

## Objective

Close every interaction gap that separates this composer from world-class chat products. When this sprint lands, a user can drag files, see image thumbnails, get instant mobile keyboard affordances, and navigate the mentions system entirely through a screen reader — without any change to the component architecture or existing test contracts. `[CCH-S1-010]`

---

## Available Assets

| File | Role in this sprint |
|---|---|
| `src/frameworks/ui/ChatInput.tsx` | Drag-and-drop zone, `enterKeyHint`, `aria-label`, file pill thumbnails, `aria-activedescendant` |
| `src/hooks/chat/useChatComposerState.ts` | New `handleFileDrop` handler |
| `src/components/MentionsMenu.tsx` | `tabIndex`, `id` attributes, live region |
| `src/app/styles/chat.css` | Drag-over visual state, thumbnail styling |
| `src/app/api/chat/uploads/route.ts` | Reference for `ALLOWED_MIME_TYPES` constant (import or duplicate) |

---

## Task 1.1 — Drag-And-Drop File Handling

**Spec ref:** `CCH-021`, `CCH-109`
**Files:** `ChatInput.tsx`, `useChatComposerState.ts`, `chat.css`
**Test refs:** `CCH-T300` through `CCH-T313`

### Design

The composer `<form>` element becomes a drop zone. No external libraries. The implementation uses a `dragDepth` counter to handle the nested-element flicker problem (child elements fire `dragenter`/`dragleave` as the pointer moves across them).

### Architecture — useChatComposerState additions

1. Add `handleFileDrop: (event: React.DragEvent) => void` to the `ChatComposerState` interface. `[CCH-S1-020]`

2. Add `ALLOWED_MIME_TYPES` as a module-level constant. Import from the upload route if it is already exported; otherwise, define a shared constant in `src/lib/chat/file-validation.ts` and import in both locations. The canonical set is:
   ```
   application/pdf, text/plain, image/jpeg, image/png, image/gif, image/webp
   ```
   `[CCH-S1-021]`

3. Add `MAX_FILE_SIZE_BYTES = 32 * 1024 * 1024` alongside the MIME set if not already shared. `[CCH-S1-022]`

4. Implementation of `handleFileDrop`:
   ```tsx
   const handleFileDrop = useCallback(
     (event: React.DragEvent) => {
       event.preventDefault();
       if (isSending) return;

       const dropped = Array.from(event.dataTransfer.files);
       const valid = dropped.filter(
         (file) =>
           ALLOWED_MIME_TYPES.has(file.type) &&
           file.size <= MAX_FILE_SIZE_BYTES,
       );
       if (valid.length === 0) return;

       setPendingFiles((current) => [...current, ...valid]);
     },
     [isSending],
   );
   ```
   `[CCH-S1-023]`

5. Return `handleFileDrop` from the hook. `[CCH-S1-024]`

### Architecture — ChatInput form handlers

6. Add a `dragDepthRef = useRef(0)` to ChatInput. `[CCH-S1-025]`

7. Add `onDragEnter` on the `<form>`:
   ```tsx
   onDragEnter={(e) => {
     e.preventDefault();
     dragDepthRef.current += 1;
     e.currentTarget.setAttribute("data-chat-composer-dragover", "true");
   }}
   ```
   `[CCH-S1-026]`

8. Add `onDragLeave` on the `<form>`:
   ```tsx
   onDragLeave={(e) => {
     dragDepthRef.current -= 1;
     if (dragDepthRef.current === 0) {
       e.currentTarget.removeAttribute("data-chat-composer-dragover");
     }
   }}
   ```
   `[CCH-S1-027]`

9. Add `onDragOver` on the `<form>`:
   ```tsx
   onDragOver={(e) => e.preventDefault()}
   ```
   (Required to make the element a valid drop target.) `[CCH-S1-028]`

10. Add `onDrop` on the `<form>`:
    ```tsx
    onDrop={(e) => {
      e.preventDefault();
      dragDepthRef.current = 0;
      e.currentTarget.removeAttribute("data-chat-composer-dragover");
      onFileDrop(e);
    }}
    ```
    `[CCH-S1-029]`

11. Add `onFileDrop: (event: React.DragEvent) => void` to the `ChatInputProps` interface. `[CCH-S1-030]`

12. Wire `onFileDrop` through `ChatContentSurface` → `ChatInput` from the composer controller. `[CCH-S1-031]`

### Architecture — CSS drag-over state

13. Add to `chat.css` under `@layer utilities`:
    ```css
    [data-chat-composer-dragover="true"] {
      border-style: dashed;
      border-color: var(--accent-interactive);
      background: color-mix(in oklab, var(--accent-interactive) 6%, var(--surface));
      transition: border-color 120ms ease, background-color 120ms ease;
    }
    ```
    `[CCH-S1-032]`

14. Add floating-shell override:
    ```css
    [data-chat-shell-kind="floating"] [data-chat-composer-dragover="true"] {
      border-color: var(--fva-shell-action-primary);
      background: color-mix(in oklab, var(--fva-shell-action-primary) 8%, var(--fva-shell-composer-surface));
    }
    ```
    `[CCH-S1-033]`

### Test plan — `tests/chat-composer-drag-drop.test.tsx`

| Test ID | Scenario | Setup | Assertion |
|---|---|---|---|
| `CCH-T300` | Drop a JPEG | Create `File` with `type: "image/jpeg"`, fire `dragEnter`, `drop` | `pendingFiles` includes the JPEG |
| `CCH-T301` | Drop a PDF | Create `File` with `type: "application/pdf"`, fire `drop` | `pendingFiles` includes the PDF |
| `CCH-T302` | Drop 2 valid files | DataTransfer with 2 files | Both added to `pendingFiles` |
| `CCH-T305` | Drop a `.exe` | `File` with `type: "application/x-msdownload"` | `pendingFiles` unchanged |
| `CCH-T306` | Drop while `isSending=true` | Set `isSending`, fire drop | `pendingFiles` unchanged |
| `CCH-T310` | Drop 3 files: 1 JPEG, 1 PDF, 1 .docx | Mixed DataTransfer | Only JPEG + PDF added |
| `CCH-T311` | DragEnter then DragLeave without drop | Fire enter, then leave | `data-chat-composer-dragover` removed |
| `CCH-T312` | DragEnter on parent, DragEnter on child, DragLeave on child | Counter-based | `data-chat-composer-dragover` still present (depth > 0) |
| `CCH-T313` | Drop a 40MB file | `File` with `size: 40 * 1024 * 1024` | File rejected by size filter |

---

## Task 1.2 — Mobile Keyboard Affordance

**Spec ref:** `CCH-022`, `CCH-110`
**File:** `src/frameworks/ui/ChatInput.tsx`
**Test refs:** `CCH-T340`, `CCH-T341`

### Implementation

1. Add `enterKeyHint="send"` to the `<textarea>` element. `[CCH-S1-040]`

That's it. One attribute. Mobile Safari and Chrome will display a "Send" label on the return key instead of a generic ⏎.

### Test plan

| Test ID | Assertion |
|---|---|
| `CCH-T340` | `screen.getByPlaceholderText("Ask Studio Ordo...").getAttribute("enterKeyHint")` equals `"send"` |

---

## Task 1.3 — File Pill Image Thumbnails

**Spec ref:** `CCH-023`, `CCH-108`
**File:** `src/frameworks/ui/ChatInput.tsx` (pending extraction in Sprint 2 to `ComposerFilePills`)
**Test refs:** `CCH-T320` through `CCH-T333`

### Design

Image files get a tiny inline thumbnail. Non-image files get a type-appropriate icon. Object URLs are created lazily and revoked on removal or unmount.

### Architecture

1. Add a `filePreviewUrls` ref (`useRef<Map<File, string>>(new Map())`) to ChatInput. `[CCH-S1-050]`

2. Create a helper function inside the component:
   ```tsx
   function getPreviewUrl(file: File): string | null {
     if (!file.type.startsWith("image/")) return null;
     const existing = filePreviewUrls.current.get(file);
     if (existing) return existing;
     const url = URL.createObjectURL(file);
     filePreviewUrls.current.set(file, url);
     return url;
   }
   ```
   `[CCH-S1-051]`

3. Add a cleanup `useEffect` that revokes all URLs on unmount:
   ```tsx
   useEffect(() => {
     const urls = filePreviewUrls.current;
     return () => {
       urls.forEach((url) => URL.revokeObjectURL(url));
       urls.clear();
     };
   }, []);
   ```
   `[CCH-S1-052]`

4. When `onFileRemove(i)` fires, revoke the URL for that file before calling the parent handler:
   ```tsx
   const handleLocalFileRemove = (index: number) => {
     const file = pendingFiles[index];
     const url = filePreviewUrls.current.get(file);
     if (url) {
       URL.revokeObjectURL(url);
       filePreviewUrls.current.delete(file);
     }
     onFileRemove(index);
   };
   ```
   `[CCH-S1-053]`

5. Update the file pill rendering:
   ```tsx
   {pendingFiles.map((file, i) => {
     const previewUrl = getPreviewUrl(file);
     const icon = file.type === "application/pdf" ? "📄"
       : file.type === "text/plain" ? "📝"
       : null;

     return (
       <div key={i} className="ui-chat-file-pill ..." title={file.name}>
         {previewUrl ? (
           <img
             src={previewUrl}
             alt=""
             className="h-6 w-6 shrink-0 rounded object-cover"
           />
         ) : icon ? (
           <span className="shrink-0 text-sm" aria-hidden="true">{icon}</span>
         ) : null}
         <span className="max-w-30 truncate">{file.name}</span>
         <button ... onClick={() => handleLocalFileRemove(i)} ...>✕</button>
       </div>
     );
   })}
   ```
   `[CCH-S1-054]`

6. The `title={file.name}` attribute provides full-name access on hover for long filenames. `[CCH-S1-055]`

### CSS — thumbnail in pill

7. No new CSS needed — the `h-6 w-6 rounded object-cover` utilities handle the thumbnail. The existing `ui-chat-file-pill` styling remains unchanged. `[CCH-S1-056]`

### Test plan

| Test ID | Scenario | Assertion |
|---|---|---|
| `CCH-T320` | Render with JPEG file in `pendingFiles` | An `<img>` element exists inside the pill |
| `CCH-T321` | Render with PNG file | An `<img>` element exists |
| `CCH-T322` | Render with PDF file | "📄" text exists; no `<img>` element |
| `CCH-T325` | Render with text/plain file | "📝" text exists; no `<img>` element |
| `CCH-T332` | Render with 10 files | All 10 pills render |
| `CCH-T333` | File name is 200 chars | Pill text is truncated; `title` attribute contains full name |

Note: `URL.createObjectURL` is not available in jsdom. Mock it in the test file:
```ts
globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
globalThis.URL.revokeObjectURL = vi.fn();
```

---

## Task 1.4 — Accessibility Hardening

**Spec ref:** `CCH-026` through `CCH-028`, `CCH-111`
**Files:** `ChatInput.tsx`, `MentionsMenu.tsx`
**Test refs:** `CCH-T350` through `CCH-T362`

### 1.4.1 — Textarea accessible label

1. Add `aria-label="Message"` to the `<textarea>`. `[CCH-S1-060]`

### 1.4.2 — Mentions live region

2. Add a visually-hidden live region as a sibling to the `<textarea>`, inside the field wrapper:
   ```tsx
   <div
     role="status"
     aria-live="polite"
     aria-atomic="true"
     className="sr-only"
     data-chat-mention-live="true"
   >
     {activeTrigger && suggestions.length > 0
       ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available`
       : ""}
   </div>
   ```
   `[CCH-S1-061]`

3. The `sr-only` class is a standard Tailwind utility (position: absolute, width: 1px, height: 1px, overflow: hidden). Verify it exists in the project. `[CCH-S1-062]`

### 1.4.3 — `aria-activedescendant` on textarea

4. When the mentions menu is open (`activeTrigger && suggestions.length > 0`), set `aria-activedescendant` on the textarea to the id of the active option. `[CCH-S1-063]`
   ```tsx
   aria-activedescendant={
     activeTrigger && suggestions.length > 0
       ? `mention-option-${mentionIndex}`
       : undefined
   }
   ```

5. Also set `role="combobox"` and `aria-expanded={Boolean(activeTrigger && suggestions.length > 0)}` on the textarea when operating as a combobox. `[CCH-S1-064]`
   ```tsx
   role={activeTrigger && suggestions.length > 0 ? "combobox" : undefined}
   aria-expanded={activeTrigger && suggestions.length > 0 ? true : undefined}
   aria-haspopup={activeTrigger && suggestions.length > 0 ? "listbox" : undefined}
   ```

### 1.4.4 — MentionsMenu item ids and tabIndex

**File:** `src/components/MentionsMenu.tsx`

6. Add `id={`mention-option-${index}`}` to each `<button role="option">`. `[CCH-S1-065]`

7. Add `tabIndex={-1}` to each option button. This makes the element programmatically focusable (for `aria-activedescendant`) without adding it to the tab order. `[CCH-S1-066]`

### Test plan — `tests/chat-composer-accessibility.test.tsx`

| Test ID | Scenario | Assertion |
|---|---|---|
| `CCH-T350` | Render ChatInput | Textarea has `aria-label="Message"` |
| `CCH-T351` | Render with 3 suggestions and `activeTrigger="@"` | Live region contains "3 suggestions available" |
| `CCH-T352` | Render with active trigger, press ArrowDown | `aria-activedescendant` on textarea changes to next option id |
| `CCH-T353` | Render with trigger, then clear trigger (onChange empties it) | Live region is empty; `aria-activedescendant` is undefined |
| `CCH-T355` | Render with no suggestions | No `aria-activedescendant`; live region empty |
| `CCH-T356` | Render with no active trigger | Textarea does not have `role="combobox"` |
| `CCH-T360` | Render with 5 suggestions, then re-render with 2 | Live region updates to "2 suggestions available" |
| `CCH-T362` | Render with file pill, tab to remove button | Button has `aria-label="Remove {filename}"` |

---

## Task 1.5 — Send Error Visual Feedback

**Spec ref:** `CCH-102` (UI portion deferred from Sprint 0)
**File:** `ChatInput.tsx`, `chat.css`

Sprint 0 added the `onSendError` callback infrastructure. This task adds the visual surface.

### Architecture

1. Add `sendError: string | null` to `ChatInputProps`. `[CCH-S1-070]`

2. When `sendError` is not null, apply `data-chat-composer-error="true"` to the form element. `[CCH-S1-071]`

3. CSS for error state:
   ```css
   [data-chat-composer-error="true"] {
     border-color: var(--danger, #b42318);
     animation: composer-error-flash 600ms ease-out;
   }

   @keyframes composer-error-flash {
     0% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger, #b42318) 40%, transparent); }
     100% { box-shadow: 0 0 0 0 transparent; }
   }
   ```
   `[CCH-S1-072]`

4. Add a live region for the error:
   ```tsx
   {sendError && (
     <div role="alert" className="sr-only">{sendError}</div>
   )}
   ```
   `[CCH-S1-073]`

5. In `useChatSurfaceState`, manage a `sendError` state that is set by `onSendError` and auto-clears after 3 seconds via `setTimeout`. Pass it through `contentProps`. `[CCH-S1-074]`

---

## Deliverables

1. Drag-and-drop on composer form with MIME/size filtering and nested-element flicker prevention.
2. `enterKeyHint="send"` on textarea.
3. File pill image thumbnails with `URL.createObjectURL` lifecycle management.
4. `aria-label="Message"` on textarea.
5. Mentions live region with suggestion count.
6. `aria-activedescendant` linking textarea to active MentionsMenu option.
7. `tabIndex={-1}` and `id` on MentionsMenu options.
8. Combobox ARIA pattern (`role="combobox"`, `aria-expanded`, `aria-haspopup`) on textarea when menu is open.
9. Send error border flash animation + screen reader alert.
10. `data-chat-composer-dragover` CSS state for both generic and floating-shell modes.
11. Shared `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES` constants extracted to `src/lib/chat/file-validation.ts`.
12. New test files: `chat-composer-drag-drop.test.tsx`, `chat-composer-accessibility.test.tsx`.

---

## Verify

```bash
npm run typecheck
npm run lint
npm exec vitest run src/frameworks/ui/ChatInput.test.tsx tests/chat-composer-drag-drop.test.tsx tests/chat-composer-accessibility.test.tsx tests/browser-fab-chat-flow.test.tsx tests/browser-fab-mobile-density.test.tsx
npm run build
```

### Manual verification required

- [ ] iOS Safari: `enterKeyHint="send"` shows "Send" on keyboard return key
- [ ] Chrome Desktop: Drag a JPEG from Finder → dashed accent border appears → drop → thumbnail pill renders
- [ ] Firefox Desktop: Same drag-drop flow works
- [ ] Safari Desktop: Same drag-drop flow works
- [ ] VoiceOver on macOS: Type `@`, hear "3 suggestions available", ArrowDown, hear active option name

---

## Exit Criteria

1. Dragging a JPEG onto the composer shows the drag-over visual state and adds the file on drop. Verified by `CCH-T300`.
2. Dragging an `.exe` onto the composer does not add any file. Verified by `CCH-T305`.
3. Drag-enter on child element does not flicker the drag-over state. Verified by `CCH-T312`.
4. Textarea has `enterKeyHint="send"`. Verified by `CCH-T340`.
5. JPEG pill shows a thumbnail image. Verified by `CCH-T320`.
6. PDF pill shows "📄" icon. Verified by `CCH-T322`.
7. Object URLs are revoked on file removal. Verified by `CCH-T330` (mock assertion).
8. Textarea has `aria-label="Message"`. Verified by `CCH-T350`.
9. Opening mentions menu announces suggestion count to screen readers. Verified by `CCH-T351`.
10. `aria-activedescendant` updates on ArrowDown. Verified by `CCH-T352`.
11. Full vitest suite passes with zero failures.
12. `npm run build` succeeds.

---

## Completion Checklist

- [ ] Drag-and-drop handlers on composer form (`onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop`)
- [ ] `handleFileDrop` in `useChatComposerState` with MIME + size filtering
- [ ] `dragDepth` counter prevents nested-element flicker
- [ ] `data-chat-composer-dragover` CSS for generic and floating-shell modes
- [ ] `ALLOWED_MIME_TYPES` and `MAX_FILE_SIZE_BYTES` extracted to shared module
- [ ] `enterKeyHint="send"` on textarea
- [ ] File pill thumbnails for image types via `URL.createObjectURL`
- [ ] Object URL lifecycle: revoke on remove and unmount
- [ ] Type-specific icons for PDF (📄) and plain text (📝)
- [ ] `title` attribute on pills for long filename hover
- [ ] `aria-label="Message"` on textarea
- [ ] `role="combobox"` + `aria-expanded` + `aria-haspopup` on textarea when menu open
- [ ] `aria-activedescendant` linking textarea to active MentionsMenu option
- [ ] Live region with suggestion count
- [ ] `id` and `tabIndex={-1}` on MentionsMenu option buttons
- [ ] Send error border flash + screen reader alert
- [ ] All drag-drop tests pass (9 cases)
- [ ] All accessibility tests pass (8 cases)
- [ ] All existing tests pass
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` succeeds
- [ ] `npm run lint` — zero errors
- [ ] Manual iOS Safari verification of `enterKeyHint`
- [ ] Manual macOS VoiceOver verification of mentions

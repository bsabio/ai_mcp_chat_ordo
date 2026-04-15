# Sprint 2 — Chat Surface Depth And Readability

> **Goal:** Make chat messages readable, materially distinct, and proportionally correct by raising metadata opacity, tokenizing the assistant avatar, increasing bubble surface differentiation, widening the inline rail accent, and improving suggestion chip affordance.
> **Spec ref:** §5, §6, §9.2
> **Prerequisite:** Sprint 0 (tokens defined), Sprint 1 (nav complete — not strictly blocking but recommended sequence)

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `docs/_refactor/visual-hierarchy-and-proportional-balance/census.md` | baseline values for all properties being changed |
| `src/app/styles/chat.css` | semantic CSS for message bubbles, suggestions, composer |
| `src/app/styles/foundation.css` | token authority (Sprint 0 avatar token corrected) |
| `src/frameworks/ui/MessageList.tsx` | message rendering — avatar, metadata, bubbles, suggestions |
| `src/frameworks/ui/ChatInput.tsx` | helper text (tokens defined in Sprint 0, already consumed) |

---

## Task 2.1 — Raise chat metadata opacity

**What:** Update hardcoded foreground opacity values on metadata text in MessageList.tsx to bring them above the perceptual threshold for dark-mode readability.

**Modify:** `src/frameworks/ui/MessageList.tsx`

### Changes in AssistantBubble

| Element | Current class fragment | New class fragment |
| --- | --- | --- |
| Brand name | `text-foreground/30` | `text-foreground/48` |
| Timestamp | `text-foreground/18` | `text-foreground/36` |

### Changes in UserBubble

| Element | Current class fragment | New class fragment |
| --- | --- | --- |
| "You" label | `text-foreground/28` | `text-foreground/48` |
| Timestamp | `text-foreground/22` | `text-foreground/36` |

### Verification

- All four metadata elements are readable in dark mode without focal effort
- Metadata remains subordinate to content text (not competing with body tier)
- Existing MessageList tests pass

---

## Task 2.2 — Tokenize assistant avatar size

**What:** Replace hardcoded `h-6 w-6` and `width={24} height={24}` on the assistant avatar with the `--chat-avatar-size` token (corrected to 2rem in Sprint 0).

**Modify:** `src/frameworks/ui/MessageList.tsx`

### Changes in AssistantBubble

Avatar container:
- Change `h-6 w-6` → `h-(--chat-avatar-size) w-(--chat-avatar-size)`

Avatar Image:
- Change `width={24} height={24}` → `width={32} height={32}`

### Verification

- Avatar renders at 32px (default), 28px (compact), 36px (relaxed)
- Avatar is proportional to message content — neither tiny nor dominating
- Existing MessageList tests pass

---

## Task 2.3 — Increase bubble surface differentiation

**What:** Adjust gradient mix percentages and add subtle border rings in chat.css so user and assistant bubbles are materially distinct in dark mode.

**Modify:** `src/app/styles/chat.css`

### User bubble (`.ui-chat-message-user`)

Current:
```css
background: linear-gradient(180deg,
  color-mix(in oklab, var(--accent) 7%, var(--surface)) 0%,
  color-mix(in oklab, var(--accent) 4%, var(--surface)) 100%);
box-shadow: 0 12px 24px -24px color-mix(in srgb, var(--shadow-base) 9%, transparent);
```

Target:
```css
background: linear-gradient(180deg,
  color-mix(in oklab, var(--accent) 12%, var(--surface)) 0%,
  color-mix(in oklab, var(--accent) 8%, var(--surface)) 100%);
box-shadow:
  inset 0 0 0 1px color-mix(in oklab, var(--foreground) 5%, transparent),
  0 12px 24px -24px color-mix(in srgb, var(--shadow-base) 18%, transparent);
```

### Assistant bubble (`.ui-chat-message-assistant`)

Current:
```css
background: linear-gradient(180deg,
  color-mix(in oklab, var(--surface) 99%, var(--background)) 0%,
  color-mix(in oklab, var(--surface) 96%, var(--background)) 100%);
color: color-mix(in oklab, var(--foreground) 80%, transparent);
box-shadow: 0 14px 28px -26px color-mix(in srgb, var(--shadow-base) 8%, transparent);
```

Target:
```css
background: linear-gradient(180deg,
  color-mix(in oklab, var(--surface) 96%, var(--background)) 0%,
  color-mix(in oklab, var(--surface) 90%, var(--background)) 100%);
color: color-mix(in oklab, var(--foreground) 93%, transparent);
box-shadow:
  inset 0 0 0 1px color-mix(in oklab, var(--foreground) 4%, transparent),
  0 14px 28px -26px color-mix(in srgb, var(--shadow-base) 16%, transparent);
```

### Verification

- User bubbles have a visible warm accent tint
- Assistant bubbles have crisper text and a cooler, slightly differentiated surface
- Both bubbles have subtle edge definition from the inset ring
- `npm run lint:css` passes

---

## Task 2.4 — Widen inline rail accent

**What:** The assistant bubble's inline vertical accent bar is currently 1px at 6% foreground — invisible. Widen to 2px at 15%.

**Modify:** `src/frameworks/ui/MessageList.tsx`

### Changes

Inline rail element in AssistantBubble:
- Change `w-px` → `w-[2px]`

### Also modify `src/app/styles/chat.css`

`.ui-chat-inline-rail`:
- Change `color-mix(in oklab, var(--foreground) 6%, transparent)` → `color-mix(in oklab, var(--foreground) 15%, transparent)`

### Verification

- The vertical accent bar is visible as a subtle accent line inside assistant bubbles
- The accent does not compete with content text
- `npm run lint:css` passes

---

## Task 2.5 — Increase suggestion chip affordance

**What:** Raise text and border opacity on hero and followup chips so they clearly communicate interactivity.

**Modify:** `src/app/styles/chat.css`

### Hero chips (`.ui-chat-hero-chip`)

- Change text: `foreground 72%` → `foreground 82%`
- Change border: `foreground 6%` → `foreground 14%`

### Followup chips (`.ui-chat-followup-chip`)

- Change text: `foreground 66%` → `foreground 78%`
- Change border: `foreground 8%` → `foreground 14%`

### Verification

- Suggestion chips read as interactive affordances, not passive containers
- Hover states produce a visible contrast shift
- `npm run lint:css` passes

---

## Task 2.6 — Sprint 2 verification gate

### Required commands

1. `npm run typecheck`
2. `npm run lint:css`
3. `npm run spacing:audit`
4. Focused tests: MessageList tests, ChatInput tests, chat-surface tests, FAB tests

### Visual evidence checklist

- [ ] Assistant and user metadata labels are readable in dark mode
- [ ] Assistant avatar is proportionally sized (~32px default)
- [ ] User bubbles have a warm accent tint distinct from assistant bubbles
- [ ] Assistant text is crisp (93% foreground, not washed at 80%)
- [ ] Inline rail accent is visible inside assistant bubbles
- [ ] Suggestion chips look clickable — text and borders are above ghost opacity
- [ ] Helper text below composer renders at ~11.5px (not 16px)
- [ ] No existing tests have been modified or weakened

---

## Sprint 2 Deliverables Summary

| Deliverable | File | Change type |
| --- | --- | --- |
| Metadata opacity raised | MessageList.tsx | class value updates (4 elements) |
| Avatar tokenized | MessageList.tsx | class + prop value update |
| User bubble warmth increased | chat.css | gradient + shadow update |
| Assistant bubble crispness | chat.css | gradient + color + shadow update |
| Inline rail visible | MessageList.tsx + chat.css | width class + gradient update |
| Suggestion chip affordance | chat.css | text + border opacity update |
| Verification gate | — | pipeline pass |

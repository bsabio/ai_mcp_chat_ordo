# Visual Hierarchy And Proportional Balance — Refactor Spec

> **Status:** Draft
> **Date:** 2026-03-27
> **Scope:** Correct the proportional hierarchy, typographic scaling, surface depth, and metadata visibility across the navigation shell, chat message surfaces, and dark-mode token layer so the interface reads as one authored premium product instead of adjacent subsystems operating at the same visual weight.
> **Affects:** `src/app/styles/foundation.css`, `src/app/styles/shell.css`, `src/app/styles/chat.css`, `src/app/styles/utilities.css`, `src/components/SiteNav.tsx`, `src/components/shell/ShellBrand.tsx`, `src/components/AccountMenu.tsx`, `src/frameworks/ui/MessageList.tsx`, `src/frameworks/ui/ChatInput.tsx`, `src/lib/shell/shell-navigation.ts`, tests covering shell, chat, and visual-system surfaces.
> **Motivation:** The token infrastructure, semantic CSS architecture, spacing ladder, and density modes are all well-engineered. However, the values currently assigned to those tokens produce a collapsed visual hierarchy where brand, navigation labels, and metadata all occupy the same typographic tier; chat message surfaces lack material differentiation in dark mode; metadata text is below perceptual thresholds; and missing token definitions cause the helper text to render at content scale. The result is an interface that feels flat and anonymous rather than precise and authored.
> **Requirement IDs:** `VHP-XXX`

---

## 1. Problem Statement

### 1.1 Verified current defects

Seven systemic issues have been confirmed through code audit and live screenshot review. `[VHP-010]`

1. **Brand identity collapse.** The brand mark (1.618rem / 26px) and wordmark both resolve from `--tier-micro-size` (0.64rem). The brand row is the same typographic scale as nav labels, account labels, and metadata text. There is no primary spatial anchor in the navigation bar. `[VHP-011]`

2. **Primary navigation at secondary scale.** `.shell-nav-label` uses `--tier-micro-size` (0.64rem / 10.2px) with 0.14em tracking. Primary navigational affordances are rendered at metadata scale, which is below the 12px floor for comfortable peripheral reading. `[VHP-012]`

3. **Missing journal admin route.** `ACCOUNT_MENU_ROUTE_IDS` in `src/lib/shell/shell-navigation.ts` contains only `["jobs", "profile"]`. No journal admin route is defined in `SHELL_ROUTES`, so authenticated admin/staff users have no account-menu path to journal administration. `[VHP-013]`

4. **Undefined chat helper tokens.** `ChatInput.tsx` consumes `--chat-composer-helper-font-size` and `--chat-composer-helper-line-height` via Tailwind utilities, but neither token is defined anywhere in the CSS authority. The declarations resolve to nothing, causing helper text to inherit the textarea's 1rem (16px) font size — the same scale as user input, which is incorrect for hint copy. `[VHP-014]`

5. **Chat metadata below perceptual threshold.** Assistant brand name renders at `foreground/30`, assistant timestamps at `foreground/18`, user "You" label at `foreground/28`, and user timestamps at `foreground/22`. On dark backgrounds, opacity values below 30% are below the comfortable reading threshold and render as nearly invisible. `[VHP-015]`

6. **Chat bubble surface sameness.** User bubbles apply a 7%→4% accent gradient over surface. Assistant bubbles apply a 99%→96% surface gradient over background. A 3% gradient differential is imperceptible. Both bubbles read as the same material in dark mode. The assistant text is also at 80% foreground, reducing content crispness. The inline rail accent is 1px at 6% foreground — invisible. The assistant avatar is hardcoded at 24×24px, well below the 32-40px messaging convention. `[VHP-016]`

7. **Systematic dark-mode flatness.** Shadows across shell and chat surfaces operate at 8-18% opacity. Dark backgrounds absorb shadows at these levels, rendering elevation invisible. Surface mixing at 92-99% produces near-identical darkness across z-layers. Foreground opacity is overused at intermediate values (20-80%) without clear perceptual stepping, creating a washed gradient where nothing feels crisp. `[VHP-017]`

### 1.2 Root cause

The token infrastructure is correct; the values are wrong. `[VHP-020]`

The spacing refactor established a strong modular ladder, semantic role families, and density modes. The chat control surface redesign established semantic CSS, compositor hierarchy, and floating-shell visual authority. But neither work addressed:

1. the typographic scale assignments that determine whether hierarchy *exists* across surfaces
2. the opacity and shadow intensity values that determine whether hierarchy *registers* in dark mode
3. the proportional relationship between brand, navigation, content, and metadata tiers

The result is a well-engineered system producing a flat visual output. `[VHP-021]`

### 1.3 Why this matters

Visual hierarchy is not decoration — it is how the eye parses structure without reading. When brand, nav labels, and metadata share the same font size, each element competes equally for attention. The resulting cognitive load is measurably higher than an interface with clear size-importance mapping. `[VHP-022]`

Specifically:

1. The brand mark is the primary spatial anchor of the entire interface. If it reads at metadata scale, the user's eye has no strong resting point when scanning the navigation bar.
2. Primary nav labels at 10.2px require deliberate focus rather than peripheral recognition. This violates the design principle that navigation should be legible without shifting focal attention.
3. Chat messages that lack material differentiation force the user to rely exclusively on spatial position (left/right alignment) to parse conversation flow. This is fragile and slows comprehension.
4. Metadata below perceptual thresholds consumes DOM and layout budget without communicating information.

`[VHP-023]`

---

## 2. Governing Constraints

### 2.1 Active authorities

1. **Spacing Refactor** (completed) owns the modular ladder, semantic role families, and density modes. This refactor must not reopen the spacing grammar. `[VHP-030]`
2. **Chat Control Surface Redesign** (completed) owns composer hierarchy, floating-shell visual authority, and semantic CSS hooks. This refactor must not reopen compositor structure. `[VHP-031]`
3. **Visual Theme Runtime** owns theme switching, density state, and accessibility settings. This refactor must not change the runtime model. `[VHP-032]`
4. **Shell Navigation And Design System** owns route architecture, nav rail grid layout, and account menu structure. This refactor may add routes and adjust proportions but must not change navigation architecture. `[VHP-033]`

### 2.2 Architecture boundaries

This refactor must not: `[VHP-034]`

1. reopen the spacing ladder, role families, or density mode structure
2. redesign chat runtime behavior, conversation state management, or scroll ownership
3. change Enter/Shift+Enter behavior, attachment semantics, or send mechanics
4. replace the theme runtime, Tailwind, or CSS-variable model
5. change the nav rail grid layout, footer composition, or route architecture
6. introduce component-local styling systems that bypass the CSS authority layer

### 2.3 What this refactor *does* change

This refactor changes only: `[VHP-035]`

1. the **values** assigned to existing tokens and CSS selectors
2. **new tokens** where the current token layer has gaps (helper text, brand tier, nav-label tier, chat avatar)
3. **opacity and shadow intensity** values in component templates and CSS utilities
4. **route data** in shell-navigation.ts for the missing journal admin entry
5. **hardcoded dimensions** in component templates that should consume tokens instead

---

## 3. Design Goals

1. Establish a clear typographic hierarchy where brand, navigation, content, metadata, and hint text each occupy a distinct perceptual tier. `[VHP-040]`
2. Ensure every text element above metadata tier is comfortably readable in dark mode without deliberate focal effort. `[VHP-041]`
3. Create material differentiation between user and assistant chat bubbles that is visible without relying on left/right position alone. `[VHP-042]`
4. Make dark-mode elevation legible through shadow intensity and surface stepping that respects the physics of dark backgrounds. `[VHP-043]`
5. Define all consumed tokens — no CSS custom property may be referenced without a corresponding definition. `[VHP-044]`
6. Preserve the existing semantic CSS architecture, design-token chain-of-authority, and density model. `[VHP-045]`

---

## 4. Typographic Hierarchy Contract

### 4.1 Current state — collapsed hierarchy

All five surfaces currently resolve to the same type size:

| Surface | Current size | Tier |
| --- | --- | --- |
| Brand wordmark | `--tier-micro-size` (0.64rem) | micro |
| Nav labels | `--tier-micro-size` (0.64rem) | micro |
| Account labels | `--tier-micro-size` (0.64rem) | micro |
| Account avatar text | `--tier-micro-size` (0.64rem) | micro |
| Metadata / timestamps | `--tier-micro-size` (0.64rem) | micro |

This is hierarchy collapse: five conceptually distinct surfaces share one font size. `[VHP-050]`

### 4.2 Required hierarchy — distinct tiers

| Surface | Required tier | Target size | Tracking |
| --- | --- | --- | --- |
| Brand wordmark | brand | ~0.84rem (13.4px) | -0.05em to -0.06em |
| Nav labels | nav-label | ~0.72rem (11.5px) | 0.08em to 0.10em |
| Account name | nav-label | ~0.72rem (11.5px) | inherited |
| Account role label | micro | 0.64rem (keep) | inherited |
| Chat helper text | nav-label | ~0.72rem (11.5px) | normal |
| Metadata / timestamps | micro | 0.64rem (keep) | 0.14em (keep) |

Rules: `[VHP-051]`

1. brand wordmark must be visually larger than any other nav element
2. nav labels must be visually larger than metadata
3. micro tier is reserved for genuinely secondary content — timestamps, role labels, legal text
4. body content at 1.02rem remains the primary reading tier and is not modified

### 4.3 New tokens required

| Token | Purpose | Default value | Compact | Relaxed |
| --- | --- | --- | --- | --- |
| `--tier-brand-size` | brand wordmark font size | `0.84rem` | `0.78rem` | `0.90rem` |
| `--tier-nav-label-size` | primary nav and account label font size | `0.72rem` | `0.68rem` | `0.78rem` |
| `--tier-nav-label-tracking` | tracking for nav-label tier | `0.08em` | `0.08em` | `0.08em` |
| `--chat-composer-helper-font-size` | helper hint text below composer | `0.72rem` | `0.68rem` | `0.78rem` |
| `--chat-composer-helper-line-height` | line height for helper hint text | `1.3` | `1.25` | `1.35` |

Ownership: all tokens defined in `src/app/styles/foundation.css` within the `:root` scope and appropriate density-mode selectors. `[VHP-052]`

### 4.4 Brand mark proportional contract

| Property | Current | Required |
| --- | --- | --- |
| `.shell-brand-mark` width/height | `1.618rem` (≈26px) | `2.058rem` (≈33px) |
| `<Image>` width/height | `26 × 26` | `33 × 33` |
| `.shell-brand-mark` border-radius | `0.42rem` | `0.5rem` |
| Brand link opacity | `opacity-90` | full (remove opacity) |

The golden ratio relationship is preserved: $1.618 \times 1.272 \approx 2.058$. The mark occupies ~48% of the nav frame minimum height (4.236rem), approaching the 50-65% range where brand marks command attention without dominating. `[VHP-053]`

---

## 5. Opacity And Visibility Contract

### 5.1 Chat metadata — current vs required

| Element | Current | Required | Rationale |
| --- | --- | --- | --- |
| Assistant brand name | `foreground/30` | `foreground/48` | subordinate but readable |
| Assistant timestamp | `foreground/18` | `foreground/36` | present and scannable |
| User "You" label | `foreground/28` | `foreground/48` | matches assistant label weight |
| User timestamp | `foreground/22` | `foreground/36` | matches assistant timestamp weight |

`[VHP-060]`

### 5.2 Foreground opacity discipline

Establish a perceptual hierarchy for foreground opacity usage in dark mode: `[VHP-061]`

| Band | Opacity range | Use |
| --- | --- | --- |
| Content | 90-100% | body text, headings, interactive labels |
| Secondary | 60-75% | nav idle state, helper text, placeholder |
| Tertiary | 40-55% | metadata, timestamps, hint copy |
| Ghost | <30% | purely decorative, border tints, disabled |

The current pattern of applying 18-30% to informational metadata violates this scale by placing readable content in the ghost band.

### 5.3 Assistant content opacity

Assistant bubble content currently renders at `foreground/80` (via `color-mix(in oklab, var(--foreground) 80%, transparent)` in `.ui-chat-message-assistant`). Content text should be 92-95% to be comfortably crisp. `[VHP-062]`

---

## 6. Chat Surface Depth Contract

### 6.1 Bubble material differentiation

| Property | User bubble (current) | User bubble (required) | Assistant bubble (current) | Assistant bubble (required) |
| --- | --- | --- | --- | --- |
| Accent mix | 7%→4% gradient | 12%→8% gradient | — | — |
| Surface mix | — | — | 99%→96% | 96%→90% |
| Shadow opacity | 9% | 18% | 8% | 16% |
| Content color | foreground (100%) | foreground (keep) | foreground/80 | foreground/93 |
| Border ring | none | `inset 0 0 0 1px foreground/5` | none | `inset 0 0 0 1px foreground/4` |

The intent is to make user bubbles warmer (accent presence) and assistant bubbles crisper (legible text, distinct surface). `[VHP-070]`

### 6.2 Inline rail accent

The assistant bubble inline rail accent should become visible: `[VHP-071]`

| Property | Current | Required |
| --- | --- | --- |
| Width | `w-px` (1px) | `w-[2px]` |
| Gradient midpoint | `foreground 6%` | `foreground/15%` |

### 6.3 Assistant avatar

The assistant avatar should consume the existing `--chat-avatar-size` token instead of hardcoded Tailwind classes: `[VHP-072]`

| Property | Current | Required |
| --- | --- | --- |
| Container | `h-6 w-6` (24px) hardcoded | `h-(--chat-avatar-size) w-(--chat-avatar-size)` token-driven |
| Image dimensions | `width={24} height={24}` | `width={32} height={32}` |
| Token default | `--chat-avatar-size` = `var(--space-4)` (1rem) | `--chat-avatar-size` = `2rem` |
| Token compact | `var(--space-4)` (1rem) | `1.75rem` |
| Token relaxed | not defined | `2.25rem` |

### 6.4 Suggestion chip affordance

| Property | Current | Required |
| --- | --- | --- |
| Hero chip text | `foreground/72` | `foreground/82` |
| Hero chip border | `foreground/6` | `foreground/14` |
| Followup chip text | `foreground/66` | `foreground/78` |
| Followup chip border | `foreground/8` | `foreground/14` |

Interactive elements must clearly communicate affordance through sufficient contrast. `[VHP-073]`

---

## 7. Dark-Mode Shadow And Depth Recalibration

### 7.1 Shadow intensity rule

Dark backgrounds absorb shadows. For shadows to register perceptually, dark-mode shadow opacity should be approximately 2× the light-mode value. `[VHP-080]`

### 7.2 Surfaces requiring shadow adjustment

| Surface | CSS selector | Shadow current | Shadow target |
| --- | --- | --- | --- |
| Shell rail | `.ui-shell-rail` | `shadow-base 4%` | `shadow-base 8%` |
| Shell rail (glass) | `.ui-shell-rail` (supports) | `shadow-base 18%` | `shadow-base 28%` |
| Shell dropdown | `.ui-shell-dropdown` | `shadow-base 28%` | `shadow-base 38%` |
| Chat header (glass) | `.ui-chat-header-surface` (supports) | `shadow-base 18%` | `shadow-base 28%` |
| User bubble | `.ui-chat-message-user` | `shadow-base 9%` | `shadow-base 18%` |
| Assistant bubble | `.ui-chat-message-assistant` | `shadow-base 8%` | `shadow-base 16%` |
| Suggestion frame (followup) | `.ui-chat-followup-frame` | `shadow-base 18%` | `shadow-base 26%` |
| Suggestion frame (hero) | `.ui-chat-hero-suggestion-frame` | `shadow-base 18%` | `shadow-base 26%` |
| Composer frame | `.ui-chat-composer-frame` | `shadow-base 18%` | `shadow-base 26%` |

Implementation note: these adjustments should ideally be scoped to `.dark` or `[data-theme-mode="dark"]` if a light-mode–specific branch exists. If the current system uses shared values for both modes, the target values should be tuned to work acceptably in both, with the understanding that dark mode is the primary consumption context. `[VHP-081]`

### 7.3 Surface differentiation

Surface mixing at 92-99% of surface over background collapses on dark backgrounds. Where elevation stepping exists, the differential should be widened: `[VHP-082]`

| Surface | Current mix | Target mix |
| --- | --- | --- |
| Shell rail background | `var(--surface) 92%` | `var(--surface) 88%` |
| Chat transcript plane | `var(--surface) 98%` | `var(--surface) 94%` |
| Nav links container | `var(--surface) 72%` | `var(--surface) 68%` |

---

## 8. Missing Route — Journal Admin

### 8.1 Current state

`ACCOUNT_MENU_ROUTE_IDS` contains `["jobs", "profile"]`. No journal admin route exists in `SHELL_ROUTES`. `[VHP-090]`

### 8.2 Required change

Add a journal admin route definition to `SHELL_ROUTES`: `[VHP-091]`

```ts
{
  id: "journal-admin",
  label: "Journal",
  href: "/admin/journal",
  kind: "internal",
  accountVisibility: ["STAFF", "ADMIN"],
}
```

Add `"journal-admin"` to `ACCOUNT_MENU_ROUTE_IDS`:

```ts
export const ACCOUNT_MENU_ROUTE_IDS = ["jobs", "journal-admin", "profile"] as const;
```

This is a data-only change in `src/lib/shell/shell-navigation.ts`. No structural work required.

---

## 9. Surface Taxonomy

### 9.1 Navigation shell (Sprint 1)

Surfaces affected:

1. `ShellBrand` — brand mark sizing, wordmark tier, opacity
2. `SiteNav` — nav label tier, active-state contrast
3. `AccountMenu` — account label tier, avatar sizing
4. Shell CSS — `.shell-brand-row`, `.shell-brand-mark`, `.shell-nav-label`, `.shell-account-label`, `.shell-account-avatar`

`[VHP-100]`

### 9.2 Chat message surfaces (Sprint 2)

Surfaces affected:

1. `MessageList.tsx` — avatar sizing, metadata opacity, bubble radius/shadow
2. `ChatInput.tsx` — helper text token consumption (tokens already consumed; definitions needed)
3. Chat CSS — `.ui-chat-message-user`, `.ui-chat-message-assistant`, `.ui-chat-inline-rail`, `.ui-chat-followup-chip`, `.ui-chat-hero-chip`, `.ui-chat-helper-copy`

`[VHP-101]`

### 9.3 Dark-mode depth layer (Sprint 3)

Surfaces affected:

1. Shell CSS — shadow intensities on `.ui-shell-rail`, `.ui-shell-dropdown`
2. Chat CSS — shadow intensities on `.ui-chat-message-user`, `.ui-chat-message-assistant`, `.ui-chat-composer-frame`, `.ui-chat-followup-frame`, `.ui-chat-hero-suggestion-frame`, `.ui-chat-header-surface`
3. Foundation CSS — `--chat-avatar-size` token for all density modes
4. Shell CSS — surface mixing percentages on glass and rail backgrounds

`[VHP-102]`

---

## 10. Migration Strategy

### 10.1 Sprint 0 — Token definitions and missing route

1. Define the five new typography/helper tokens in `foundation.css` with density overrides
2. Fix `--chat-avatar-size` default and density values
3. Add journal-admin route to `shell-navigation.ts`
4. Verify: typecheck, lint:css, spacing:audit, existing tests pass

`[VHP-110]`

### 10.2 Sprint 1 — Navigation proportional hierarchy

1. Update `.shell-brand-row` and `.shell-brand-mark` sizing in `shell.css`
2. Update `ShellBrand.tsx` Image dimensions and remove opacity class
3. Update `.shell-nav-label` to use `--tier-nav-label-size` and `--tier-nav-label-tracking`
4. Update `.shell-account-label` to use nav-label tier
5. Increase nav active-state background differentiation
6. Verify: visual regression tests, shell tests, typecheck, lint:css

`[VHP-111]`

### 10.3 Sprint 2 — Chat surface depth and readability

1. Raise metadata opacity values in `MessageList.tsx`
2. Update assistant avatar to use `--chat-avatar-size` token
3. Increase bubble gradient differentials and shadow opacity in `chat.css`
4. Raise assistant content color to `foreground/93`
5. Widen inline rail accent
6. Increase suggestion chip opacity values
7. Verify: chat tests, FAB tests, typecheck, lint:css

`[VHP-112]`

### 10.4 Sprint 3 — Dark-mode shadow and surface recalibration

1. Increase shadow opacity on shell rail, dropdown, chat header, bubbles, composer, and suggestion frames in `shell.css` and `chat.css`
2. Widen surface-mix differentials for elevation stepping
3. Apply foreground opacity discipline across remaining surfaces
4. Verify: full quality pipeline, visual regression, browser QA evidence

`[VHP-113]`

---

## 11. Verification Strategy

### 11.1 Token completeness

Every CSS custom property referenced in component templates must have a corresponding `:root` definition. The current gap (`--chat-composer-helper-font-size` and `--chat-composer-helper-line-height`) must not recur. `[VHP-120]`

### 11.2 Regression safety

1. `npm run typecheck` must pass after each sprint
2. `npm run lint:css` must pass after each sprint
3. `npm run spacing:audit` must pass at threshold 0 after each sprint
4. Existing shell, chat, and visual-system test suites must pass
5. No test file may be deleted or weakened to achieve pass

`[VHP-121]`

### 11.3 Visual evidence

Each sprint must produce documentation confirming the target visual outcome:

1. Sprint 1: brand mark visually dominant, nav labels larger than metadata, journal admin visible in account menu
2. Sprint 2: chat metadata readable, bubbles materially distinct, avatar proportional
3. Sprint 3: shadows and elevation legible in dark mode, surface stepping visible

`[VHP-122]`

---

## 12. Anti-Goals

This refactor explicitly does not do the following: `[VHP-130]`

1. reopen the spacing ladder, role families, or density mode structure
2. redesign chat runtime behavior, conversation state, or scroll ownership
3. change the nav rail grid layout or route architecture
4. replace the theme runtime, Tailwind, or CSS-variable model
5. introduce component-local styling systems that bypass the CSS authority layer
6. create separate light-mode and dark-mode token trees (adjustments use shared values tuned for the primary dark-mode context)
7. change body content font size, line height, or reading rhythm

---

## 13. Acceptance Criteria

The refactor is complete when all of the following are true: `[VHP-140]`

1. Brand, nav-label, body, metadata, and helper tiers each occupy a distinct font size `[VHP-141]`
2. Brand mark renders at ≥48% of nav frame minimum height `[VHP-142]`
3. No CSS custom property is consumed without a corresponding definition `[VHP-143]`
4. Chat metadata text is above foreground/35 on all surfaces `[VHP-144]`
5. User and assistant bubbles are materially distinguishable without relying on left/right position `[VHP-145]`
6. Dark-mode shadows produce visible elevation on shell and chat surfaces `[VHP-146]`
7. Journal admin link is accessible from the account menu for STAFF and ADMIN users `[VHP-147]`
8. All existing tests pass without modification or weakening `[VHP-148]`
9. `typecheck`, `lint:css`, and `spacing:audit` pass at threshold 0 `[VHP-149]`

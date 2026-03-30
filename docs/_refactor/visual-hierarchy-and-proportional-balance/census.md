# Visual Hierarchy And Proportional Balance — Current-State Census

> **Date:** 2026-03-27
> **Purpose:** Record the exact pre-refactor state of every token value, opacity, shadow, and dimension that this refactor will modify, so each sprint has an unambiguous baseline.

---

## 1. Typography Tier Tokens (foundation.css :root)

| Token | Current value | Consumed by |
| --- | --- | --- |
| `--tier-micro-size` | `0.64rem` | `.shell-brand-row`, `.shell-nav-label`, `.shell-account-label`, `.shell-account-avatar`, `.shell-meta-text`, `.shell-micro-text`, `.shell-section-heading`, `.shell-supporting-text`, `.tier-micro` |
| `--tier-micro-line-height` | `1.15` | same consumers |
| `--tier-micro-tracking` | `0.14em` | same consumers |
| `--tier-body-size` | `1.02rem` | `.tier-body`, body text |
| `--tier-body-line-height` | `1.68` | `.tier-body` |
| `--tier-display-size` | `clamp(3.2rem, 5.4vw, 4.65rem)` | `.tier-display`, hero display |
| `--tier-display-line-height` | `0.94` | `.tier-display` |

### Missing tokens

| Token | Consumed in | Status |
| --- | --- | --- |
| `--tier-brand-size` | not yet | **does not exist** |
| `--tier-nav-label-size` | not yet | **does not exist** |
| `--tier-nav-label-tracking` | not yet | **does not exist** |
| `--chat-composer-helper-font-size` | `ChatInput.tsx` via `text-(length:--chat-composer-helper-font-size)` | **consumed but undefined** |
| `--chat-composer-helper-line-height` | `ChatInput.tsx` via `leading-(--chat-composer-helper-line-height)` | **consumed but undefined** |

---

## 2. Shell Brand Dimensions (shell.css + ShellBrand.tsx)

| Property | Location | Current value |
| --- | --- | --- |
| `.shell-brand-row` font-size | shell.css | `var(--tier-micro-size)` → 0.64rem |
| `.shell-brand-row` font-weight | shell.css | `560` |
| `.shell-brand-row` letter-spacing | shell.css | `-0.05em` |
| `.shell-brand-row` gap | shell.css | `var(--space-cluster-default)` → 1rem (compact: 0.75rem) |
| `.shell-brand-mark` width | shell.css | `1.618rem` (≈26px) |
| `.shell-brand-mark` height | shell.css | `1.618rem` (≈26px) |
| `.shell-brand-mark` border-radius | ShellBrand.tsx | `0.42rem` |
| `<Image>` width/height | ShellBrand.tsx | `26 × 26` |
| wordmark tracking | ShellBrand.tsx | `tracking-[-0.06em]` (inline class) |
| brand link opacity | SiteNav.tsx | `opacity-90` on `.shell-brand-row` |

---

## 3. Navigation Label Dimensions (shell.css)

| Property | Location | Current value |
| --- | --- | --- |
| `.shell-nav-label` font-size | shell.css | `var(--tier-micro-size)` → 0.64rem |
| `.shell-nav-label` font-weight | shell.css | `700` |
| `.shell-nav-label` letter-spacing | shell.css | `var(--tier-micro-tracking)` → 0.14em |
| `.shell-nav-label` text-transform | shell.css | `uppercase` |
| `.shell-account-label` font-size | shell.css | `var(--tier-micro-size)` → 0.64rem |
| `.shell-account-label` font-weight | shell.css | `700` |
| `.shell-account-label` letter-spacing | shell.css | `0.1em` |
| `.shell-account-avatar` width/height | shell.css | `1.618rem` (≈26px) |
| `.shell-account-avatar` font-size | shell.css | `var(--tier-micro-size)` |
| nav active bg | shell.css | `color-mix(in oklab, var(--foreground) 4%, var(--surface))` |
| nav idle color | shell.css | `color-mix(in oklab, var(--foreground) 68%, transparent)` |

---

## 4. Chat Avatar Dimensions (MessageList.tsx + foundation.css)

| Property | Location | Current value |
| --- | --- | --- |
| assistant avatar container | MessageList.tsx | `h-6 w-6` hardcoded (24px) |
| assistant avatar image | MessageList.tsx | `width={24} height={24}` hardcoded |
| `--chat-avatar-size` token | foundation.css | `var(--space-4)` → 1rem (16px) |
| `--chat-avatar-size` compact | foundation.css | `var(--space-4)` → 1rem |
| `--chat-avatar-size` relaxed | foundation.css | not defined |

Note: the token exists but is **not consumed** by the avatar component.

---

## 5. Chat Metadata Opacity (MessageList.tsx)

| Element | Location | Current opacity |
| --- | --- | --- |
| Assistant brand name | MessageList.tsx (AssistantBubble) | `text-foreground/30` |
| Assistant timestamp | MessageList.tsx (AssistantBubble) | `text-foreground/18` |
| User "You" label | MessageList.tsx (UserBubble) | `text-foreground/28` |
| User timestamp | MessageList.tsx (UserBubble) | `text-foreground/22` |

---

## 6. Chat Bubble Surface Values (chat.css)

| Property | User bubble (`.ui-chat-message-user`) | Assistant bubble (`.ui-chat-message-assistant`) |
| --- | --- | --- |
| Background gradient start | `accent 7% / surface` | `surface 99% / background` |
| Background gradient end | `accent 4% / surface` | `surface 96% / background` |
| Shadow opacity | `shadow-base 9%` | `shadow-base 8%` |
| Content color | `var(--foreground)` (100%) | `foreground 80%` |
| Border ring | none | none |
| Inline rail width | — | `w-px` (1px) |
| Inline rail gradient | — | `foreground 6%` midpoint |

---

## 7. Suggestion Chip Values (chat.css)

| Property | Hero chip (`.ui-chat-hero-chip`) | Followup chip (`.ui-chat-followup-chip`) |
| --- | --- | --- |
| Text color | `foreground 72%` | `foreground 66%` |
| Border | `foreground 6%` | `foreground 8%` |
| Shadow | `shadow-base 20%` | `shadow-base 22%` |

---

## 8. Shell Shadow Values (shell.css)

| Surface | Selector | Current shadow-base % |
| --- | --- | --- |
| Shell rail (default) | `.ui-shell-rail` | `4%` |
| Shell rail (glass/supports) | `.ui-shell-rail` | `18%` + `highlight-base 18%` inset |
| Shell dropdown | `.ui-shell-dropdown` | `28%` |
| Shell account avatar | `.ui-shell-account-avatar` | `shadow-base 10%` |

---

## 9. Chat Shadow Values (chat.css)

| Surface | Selector | Current shadow-base % |
| --- | --- | --- |
| Chat header (glass/supports) | `.ui-chat-header-surface` | `18%` + `highlight-base 18%` inset |
| User bubble | `.ui-chat-message-user` | `9%` |
| Assistant bubble | `.ui-chat-message-assistant` | `8%` |
| Followup frame | `.ui-chat-followup-frame` | `18%` |
| Hero suggestion frame | `.ui-chat-hero-suggestion-frame` | `18%` |
| Composer frame | `.ui-chat-composer-frame` | `18%` |
| Composer focus | `.ui-chat-composer-frame-focus` | `24%` |

---

## 10. Surface Mixing Values (shell.css + chat.css)

| Surface | Selector | Current mix |
| --- | --- | --- |
| Shell rail bg | `.ui-shell-rail` | `surface 92%` |
| Shell rail glass | `.ui-shell-rail` (supports) | `glass-sublayer 78%` |
| Nav links container | `.ui-shell-nav-links` | `surface 72%` |
| Chat transcript plane | `.ui-chat-transcript-plane` | `surface 98%` |

---

## 11. Shell Navigation Route Data (shell-navigation.ts)

| Constant | Current value |
| --- | --- |
| `ACCOUNT_MENU_ROUTE_IDS` | `["jobs", "profile"]` |
| Journal admin route in `SHELL_ROUTES` | **does not exist** |

---

## 12. Helper Text Token Consumption (ChatInput.tsx)

| Tailwind utility | Token consumed | Defined? |
| --- | --- | --- |
| `text-(length:--chat-composer-helper-font-size)` | `--chat-composer-helper-font-size` | **No** |
| `leading-(--chat-composer-helper-line-height)` | `--chat-composer-helper-line-height` | **No** |

These utilities produce no CSS output when the referenced custom properties are undefined, causing the element to inherit the parent's font-size (effectively 1rem / 16px from the textarea context).

# Sprint 3 - Shell Visual System Hardening

> **Goal:** Replace shell-specific arbitrary spacing, typography, and status
> chrome with shared shell tokens and truthful shell treatments.
> **Spec ref:** `SND-014`, `SND-016`, `SND-034`, `SND-080` through `SND-083`,
> `SND-102`, `SND-116`
> **Prerequisite:** Sprint 2 committed
> **Test count target:** 583 existing + 5 new = 588 total

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/globals.css` | Root tokens already define layout, density, safe-area, surface, and utility primitives including `.site-container`, `.text-label`, `.glass-surface`, and safe-area helpers |
| `src/components/SiteNav.tsx` | Sprint 1 moved header composition onto `ShellBrand`, `PRIMARY_NAV_ITEMS`, and model-driven active nav, but the shell still uses local spacing and microtype stacks such as `min-h-14`, `py-2`, `text-base`, and `tracking-tighter` |
| `src/components/SiteFooter.tsx` | Sprint 1 now resolves truthful footer groups from canonical shell data and no longer renders the fake global-status row, but it still uses local spacing/type values such as `py-12`, `gap-10`, `text-[11px]`, `text-xs`, and `text-[9px]` |
| `src/components/AccountMenu.tsx` | Account menu already depends heavily on shell-adjacent micro-typography and spacing decisions that should align with shell-level roles |
| `src/frameworks/ui/ChatHeader.tsx` | Embedded and floating chat headers also mix shell-like chrome with local spacing and microtype values |
| `src/components/shell/ShellBrand.tsx` | Sprint 0 introduces the shared brand primitive, so shell mark sizing and wordmark spacing should key off that primitive rather than per-surface ad hoc classes |
| `src/lib/shell/shell-navigation.ts` | Sprint 0 and Sprint 1 already established the canonical shell route model used by header and footer, so Sprint 3 should not reopen route truth or IA scope while hardening shell visuals |
| `src/lib/shell/shell-commands.ts` | Sprint 2 establishes a shared shell command-definition layer for navigation and theme actions, so visual hardening must not split command labels or reintroduce parallel shell vocabularies |
| `tests/browser-motion.test.tsx` | Existing shell/browser tests already assert some nav layering and motion behavior, so visual-token changes must preserve those semantics |
| `tests/site-shell-composition.test.tsx` | Sprint 1 now asserts truthful footer composition and the absence of the old fake status copy, which Sprint 3 should preserve rather than re-solve |

## Inputs From Prior Sprints

Sprint 0 established the canonical shell route and brand model.

Sprint 1 moved header and footer composition onto that model, which means
Sprint 3 should treat shell IA and footer truthfulness as established inputs,
not as open design questions. The fake `Global Status: Optimal` copy is already
removed and should stay removed.

Sprint 2 unified palette and slash-command surfaces onto shared shell command
definitions. Sprint 3 should preserve that command parity and avoid introducing
surface-specific visual labels or helper forks while touching shell-adjacent UI.

---

## Task 3.1 - Introduce shell-scoped layout and typography tokens

**What:** Extend global CSS with shell-level utilities and variables for nav,
footer, metadata text, shell group headings, and shell action spacing.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/globals.css` |
| **Spec** | `SND-034`, `SND-080` through `SND-082`, `SND-116` |

### Task 3.1 Notes

Add shell primitives such as:

1. nav and footer vertical rhythm tokens
2. shell microcopy and metadata text roles
3. shell section-heading utility
4. shared mark-size and brand-gap utilities where appropriate

Keep them shell-specific. Do not turn this sprint into a full design-system
rewrite.

Use a naming pattern that makes shell-only intent obvious. A structure close to
the following is sufficient:

```css
:root {
  --shell-nav-min-height: ...;
  --shell-footer-block-padding: ...;
  --shell-section-gap: ...;
  --shell-meta-font-size: ...;
  --shell-meta-tracking: ...;
  --shell-brand-mark-size: ...;
}

@utility shell-meta-text { ... }
@utility shell-section-heading { ... }
@utility shell-action-row { ... }
@utility shell-brand-mark { ... }
```

The intent is to create a small shell-composition layer on top of the existing
global tokens, not to rename or replace the global token system.

### Task 3.1 Verify

```bash
npm run build
```

---

## Task 3.2 - Migrate shell surfaces to the new shell primitives

**What:** Update shell-facing components to consume the new utilities instead of
repeating arbitrary value stacks.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteNav.tsx` |
| **Modify** | `src/components/SiteFooter.tsx` |
| **Modify** | `src/components/shell/ShellBrand.tsx` |
| **Modify** | `src/components/AccountMenu.tsx` |
| **Modify** | `src/frameworks/ui/ChatHeader.tsx` |
| **Spec** | `SND-014`, `SND-034`, `SND-080` through `SND-082`, `SND-116` |

### Task 3.2 Notes

The target is consistency, not visual flattening.

Use the new shell primitives where components are expressing the same semantic
role, for example:

1. shell section headings
2. shell microcopy/meta text
3. shell action row spacing
4. shared brand mark sizing

This sprint should not attempt to normalize every utility class in these
components. It should migrate repeated shell-role patterns only. For example,
route-specific layout classes, overlay positioning, and browser-hardening
classes that are not shell-role duplicates may remain as-is.

Because `ShellBrand` still owns the current hardcoded brand gap, type stack, and
mark sizing, Sprint 3 must update that primitive directly rather than trying to
recreate brand sizing through per-surface wrappers.

### Task 3.2 Verify

```bash
npm run test -- tests/browser-motion.test.tsx
npm run test -- tests/browser-overlays.test.tsx
```

---

## Task 3.3 - Resolve decorative status truthfulness

**What:** Preserve truthful shell status treatment by preventing the old
decorative global-status pattern from being reintroduced during visual cleanup.

| Item | Detail |
| --- | --- |
| **Modify** | `src/components/SiteFooter.tsx` |
| **Spec** | `SND-016`, `SND-083`, `SND-102` |

### Task 3.3 Notes

Sprint 1 already removed the fake health indicator. Sprint 3 should keep that
truthful baseline while migrating shell visuals.

Valid outcomes for this sprint:

1. leave the footer without an operational-status row, or
2. add non-operational product context that does not imply live monitoring, or
3. wire a future status treatment to a verified runtime signal already owned elsewhere in the product

Option 1 or 2 is preferred unless a real status source already exists and can
be adopted without broadening scope.

If the status row is retained in any form, the sprint must rename it away from
live operational language such as "Global Status" unless a verified runtime
signal is wired in the same sprint.

### Task 3.3 Verify

```bash
npm run test -- tests/shell-visual-system.test.tsx
```

---

## Task 3.4 - Add a focused shell visual-system regression test

**What:** Add tests that pin the presence of shell primitives or truthful shell
copy so future refactors do not regress to arbitrary duplicated chrome.

| Item | Detail |
| --- | --- |
| **Create** | `tests/shell-visual-system.test.tsx` |
| **Spec** | `SND-080` through `SND-083`, `SND-116` |

### Task 3.4 Notes

Prefer assertions on semantics and shared hooks over brittle exact class-string
snapshots. For example, assert shared brand primitive reuse, shell-section label
roles, and the absence of misleading status claims.

Assert at minimum:

1. shell surfaces no longer render the literal misleading status copy from the
   pre-sprint footer unless a real data-backed source exists
2. shell brand mark sizing and shell meta-text roles are reused across at least
   two shell surfaces
3. account-menu shell headings or meta text use shared shell-role primitives
   rather than one-off role duplication
4. chat-header shell microcopy or action-row treatments use the same shell-role
   primitives introduced for other shell surfaces

Testing may inspect for shared semantic hooks, data attributes, or stable role
classes introduced by this sprint, but should avoid snapshotting every class.

The new test must render the real `AccountMenu` and the real `ChatHeader`
instead of mocking them away, otherwise Task 3.2 verification will miss two of
the four surfaces this sprint modifies.

### Task 3.4 Verify

```bash
npm run test -- tests/shell-visual-system.test.tsx
```

---

## Completion Checklist

- [x] Shell-level CSS primitives exist for nav/footer rhythm and shell microtype
- [x] Header, footer, account menu, and chat header use shared shell roles where appropriate
- [x] Decorative fake status treatment is removed or made truthful
- [x] Shared shell primitives are scoped to shell-role patterns, not used as a broad CSS rewrite excuse
- [x] Shell visual-system regression coverage exists and passes

## QA Deviations

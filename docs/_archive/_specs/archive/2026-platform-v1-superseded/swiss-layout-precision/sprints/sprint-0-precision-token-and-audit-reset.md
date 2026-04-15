# Sprint 0 - Precision Token And Audit Reset

> **Goal:** Establish the refinement boundary for Swiss layout work, formalize precision tokens for shell and hero roles, and make homepage hero-state composition an explicit first-class mode.
> **Spec sections:** `SLP-010` through `SLP-093`
> **Prerequisite:** Current `main` with `npm run quality` passing (593/103 baseline)

---

## Available Assets

| File | Verified asset |
| --- | --- |
| `src/app/globals.css` | Root design tokens (`--phi-*`, `--shell-*`), `@utility` shell roles such as `shell-nav-label`, `shell-brand-row`, `shell-panel-heading`, `shell-meta-text`, `shell-supporting-text` |
| `src/components/SiteNav.tsx` | `export function SiteNav({ user }: SiteNavProps)` with route-aware nav links derived from `PRIMARY_NAV_ITEMS` |
| `src/components/AccountMenu.tsx` | `export function AccountMenu({ user }: AccountMenuProps)` with anonymous/authenticated branching and dropdown sections |
| `src/frameworks/ui/ChatMessageViewport.tsx` | `export const ChatMessageViewport: React.FC<ChatMessageViewportProps>` currently switches embedded stack alignment based on `showEmbeddedStageBranding` |
| `src/frameworks/ui/MessageList.tsx` | `export const MessageList: React.FC<MessageListProps>` with `data-message-list-state` and hero-state intro composition |

---

## Tasks

### 1. Formalize precision token groups in `globals.css`

Refine the token layer so shell/homepage precision is explicit, not implied.

Required work:

1. Add shell rail tokens for nav item padding, rail gap, account rail gap, and dropdown section padding.
2. Add homepage hero tokens for intro stack gap, hero title width, greeting bubble width, chip cluster gap, and composer-top offset.
3. Prefer these named tokens over ad hoc `(--phi-*)` usage when the role is semantically stable.

Verify:

```bash
npx eslint src/app/globals.css
```

### 2. Strengthen shell role utilities without changing route truth

Update shell utility roles in `globals.css` only where hierarchy needs to become more explicit.

Required work:

1. Distinguish wordmark, nav label, panel heading, and support text more clearly.
2. Keep role names stable where possible so existing tests still express intent.
3. Do not add new route definitions or component-local nav arrays.

Verify:

```bash
npm run test -- tests/shell-visual-system.test.tsx tests/shell-acceptance.test.tsx
```

### 3. Make hero-state layout an explicit, durable mode

Ensure `MessageList` and `ChatMessageViewport` expose a robust distinction between hero and conversation states.

Required work:

1. Preserve `data-message-list-state="hero"` for first-load homepage mode.
2. Ensure the viewport stack alignment uses that state intentionally rather than incidental flex behavior.
3. Keep hero-state implementation compatible with the homepage chat-shell stage contract.

Verify:

```bash
npm run test -- src/frameworks/ui/MessageList.test.tsx
```

### 4. Record implementation boundaries in code comments only where necessary

If any new visual state logic risks future confusion, add one short explanatory comment near the boundary condition.

Required work:

1. Use comments sparingly.
2. Prefer comments on state transitions and layout boundaries, not on obvious class changes.

Verify:

```bash
npx tsc --noEmit
```

---

## Completion Checklist

- [x] Precision token groups added or refined in `globals.css`
- [x] Shell role hierarchy utilities updated without route-truth drift
- [x] Hero-state vs conversation-state contract made explicit and durable
- [x] Verification commands passed

## QA Deviations

1. `npx eslint src/app/globals.css` does not lint this file in the current repo configuration and returns `File ignored because no matching configuration was supplied` rather than actionable diagnostics. Sprint verification used the project-supported `npm run quality` gate in addition to `npx tsc --noEmit`, `npm run test -- src/frameworks/ui/MessageList.test.tsx`, and `npm run test -- tests/shell-visual-system.test.tsx tests/shell-acceptance.test.tsx`.
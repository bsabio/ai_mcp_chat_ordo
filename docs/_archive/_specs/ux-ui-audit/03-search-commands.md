# UX / UI Audit 03 — Search & Command Navigation

**Severity:** P1 High  
**Scope:** `AdminSearchBar`, `shell-commands.ts`, `useMentions.ts`, top-rail search UX

---

## UX-09 · P1 High — No Command Navigation in the Top Rail

**Files:**  
- `src/components/admin/AdminSearchBar.tsx`  
- `src/lib/shell/shell-commands.ts`  
- `src/lib/shell/shell-navigation.ts`

---

### Current State

**Admin search (`AdminSearchBar`):**  
The admin layout renders an `AdminSearchBar` at the top of every admin page. It performs free-text entity search (users, leads, jobs, conversations, prompts, journal posts) via a server action. The search is reactive and shows a dropdown of matching records.

What it **does not do:**  
- `/` command navigation (e.g., type `/jobs` → navigate to `/admin/jobs`)
- Navigate to admin sections directly
- Support keyboard shortcut to open (Cmd+K / Ctrl+K)
- Support action commands ("Cancel job X", "Archive conversation Y")

**Chat shell commands (`shell-commands.ts`):**  
A separate command system exists for the chat surface. The chat input accepts `/` prefix (`useMentions.ts`: `{ char: "/", category: "command" }`). The `shell-commands.ts` defines navigation and theme commands. However, these only work inside the chat input — not from the global top rail.

---

### The Gap

The user wants: "a search with `/` commands to navigate the app into the top rail."

The infrastructure is 80% there:
- Entity search is done (`AdminSearchBar`)
- Command definitions exist (`shell-commands.ts`)
- Shell routes have `showInCommands: true` flags (Library, Blog) but admin routes do not

The missing piece: **merge the entity search and command system into a single `⌘K` / `/` command palette that works from the top rail in both admin and public contexts.**

---

## Recommendation: Upgrade AdminSearchBar to CommandSearch

### Phase 1 — Add `/` commands to the existing AdminSearchBar

1. **Add `showInCommands: true`** to admin routes in `shell-navigation.ts`:

```typescript
{ id: "admin-dashboard",    showInCommands: true }
{ id: "admin-users",        showInCommands: true }
{ id: "admin-leads",        showInCommands: true }
{ id: "admin-jobs",         showInCommands: true }
{ id: "admin-conversations",showInCommands: true }
{ id: "admin-prompts",      showInCommands: true }
{ id: "journal-admin",      showInCommands: true }
{ id: "admin-system",       showInCommands: true }
```

2. **Detect `/` prefix** in the search input:

```typescript
// In AdminSearchBar
const isCommand = query.startsWith("/");
const commandQuery = isCommand ? query.slice(1) : query;
```

3. **Show command results first** when the query starts with `/`. Filter from `resolveShellNavigationCommandDefinitions()` by prefix match. Entity results come second.

4. **Example UX:**
```
  [ / users          ]
  ─────────────────────
  → Users            /admin/users
  → Journal          /admin/journal
  ─────────────────────
  Entity results:
  ○ Jane Smith       User — jane@example.com
  ○ Job #abc         Image generation — running
```

### Phase 2 — Keyboard shortcut (Cmd+K) 

Add a global `keydown` listener that focuses and opens the search bar when `⌘K` (macOS) or `Ctrl+K` (Windows/Linux) is pressed. The `AdminSearchBar` already has a ref to the input element — just call `inputRef.current?.focus()` from a `useEffect`.

### Phase 3 — Public shell command palette

The public `SiteNav` has no search bar. To add `/` commands to the public shell:
1. Add a `CommandSearch` component to `SiteNav` (icon button that opens a modal).
2. It uses the same `shell-commands.ts` definitions pre-filtered by user role.
3. The `useMentions` `/` system in the chat input remains independent (it's contextual to the chat surface).

---

### Existing Infrastructure to Reuse

| File | What it provides |
|------|-----------------|
| `src/lib/shell/shell-commands.ts` | `resolveShellNavigationCommandDefinitions(user)` — role-filtered nav commands |
| `src/lib/admin/search/admin-search.ts` | Entity search across 9 entity types |
| `src/components/admin/AdminSearchBar.tsx` | Debounced search UI with dropdown results |
| `src/hooks/useCommandRegistry.ts` | Command model already typed |

---

## UX-10 · P2 Medium — AdminSearchBar Has No Keyboard Navigation in Results

**File:** `src/components/admin/AdminSearchBar.tsx`

**Problem:**  
The search results dropdown opens but does not support arrow-key navigation. The user must click results with a mouse/pointer. This breaks keyboard-only and screen-reader workflows.

**Recommendation:**  
Add `aria-activedescendant`, `role="listbox"`, and arrow-key handlers to the results list. This is a standard combobox pattern (ARIA 1.2 `combobox` + `listbox`).

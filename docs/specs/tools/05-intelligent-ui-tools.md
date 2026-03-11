# Tool Spec 05 — Intelligent UI Tools

> **Status:** Draft
> **Priority:** Medium — improves UX polish and accessibility workflow
> **Scope:** Theme intelligence, route-aware navigation, accessibility
>   persistence, undo capability
> **Dependencies:** None
> **Affects:** `set_theme`, `adjust_ui`, `navigate` tools

---

## 1. Problem Statement

The three UI tools (`set_theme`, `adjust_ui`, `navigate`) are pure signal
generators — they return a success string and the real work happens client-side.
This is architecturally sound (the server doesn't own the DOM), but it leaves
significant quality on the table:

- **set_theme:** No validation that the theme exists. No feedback about what
  changed. The LLM says "I've changed the theme" but can't describe the visual
  effect.
- **adjust_ui:** The richest schema (8 properties, presets for elderly,
  color-blind, dyslexia, motor-impaired, cognitive) but no persistence.
  Refresh the page → settings lost. No conflict detection when a preset
  overrides a manual setting.
- **navigate:** Accepts any path string. No validation against actual routes.
  No semantic navigation ("take me to the accessibility chapter" requires
  knowing the exact URL). No breadcrumb feedback.

---

## 2. Theme Intelligence — `set_theme`

### 2.1 Server-Side Validation

Validate the theme against a known list. Return the theme's visual properties
so the LLM can describe the change:

```typescript
interface ThemeResponse {
  theme: string;
  applied: true;
  properties: {
    mode: "light" | "dark";
    backgroundColor: string;      // CSS color
    textColor: string;
    accentColor: string;
    description: string;          // "Dark mode with blue accents"
  };
  previous?: string;              // previous theme name, if known
}
```

### 2.2 Theme Registry

Define themes as a data structure rather than hardcoding:

```typescript
// src/core/entities/themes.ts
const THEMES: Record<string, ThemeDefinition> = {
  light: {
    mode: "light",
    backgroundColor: "#FFFFFF",
    textColor: "#1A1A1A",
    accentColor: "#3B82F6",
    description: "Clean white background with blue accents",
  },
  dark: {
    mode: "dark",
    backgroundColor: "#0F172A",
    textColor: "#E2E8F0",
    accentColor: "#60A5FA",
    description: "Dark slate background with soft blue accents, reduces eye strain in low-light environments",
  },
  // ... other themes
};
```

The LLM can now say: *"I've switched to dark mode — you'll see a dark slate
background with soft blue text. This should be easier on your eyes in
low-light environments."*

### 2.3 Error Handling

Invalid theme → return the list of valid themes:

```typescript
{
  error: "Unknown theme 'ocean'",
  validThemes: ["light", "dark", "system", "high-contrast"],
}
```

---

## 3. Accessibility Persistence — `adjust_ui`

### 3.1 Persist Settings for Authenticated Users

Store UI preferences in SQLite, keyed by user ID:

```sql
CREATE TABLE IF NOT EXISTS user_ui_preferences (
  user_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL,      -- JSON blob
  updated_at TEXT NOT NULL
);
```

### 3.2 Enhanced Response

```typescript
interface AdjustUIResponse {
  applied: Record<string, string>;     // what was set
  previous: Record<string, string>;    // what it was before
  persisted: boolean;                  // true for authenticated users
  conflicts?: string[];                // e.g., "preset 'elderly' overrides fontSize from 'sm' to 'xl'"
  undoAvailable: boolean;
}
```

### 3.3 Conflict Detection

When a preset is applied, compare its implied settings with any explicit
settings already active:

```text
User has: fontSize = "sm"
User requests: preset = "elderly"
Elderly preset implies: fontSize = "xl"

Response includes:
  conflicts: ["Preset 'elderly' overrides your font size from 'sm' to 'xl'"]
```

This lets the LLM inform the user: *"I've applied the elderly accessibility
preset. Note: this changed your font size from small to extra-large. Would
you like to keep that, or use a different size?"*

### 3.4 Undo Capability

Track previous settings so the LLM can offer "undo":

```typescript
// The previous state is stored in the session
// Tool can be called with: { undo: true } to revert to previous state
```

### 3.5 Restore on Login

When an authenticated user logs in, restore their saved UI preferences
automatically. The `/api/auth` endpoint returns preferences alongside the
session, and the client applies them.

### 3.6 Enhanced Schema

```typescript
{
  name: "adjust_ui",
  input_schema: {
    type: "object",
    properties: {
      // ... existing properties (preset, fontSize, contrast, etc.)
      undo: {
        type: "boolean",
        description: "Revert to previous UI settings"
      },
      save: {
        type: "boolean",
        description: "Save current settings as user defaults (authenticated only)"
      },
    },
  },
}
```

---

## 4. Route-Aware Navigation — `navigate`

### 4.1 Route Registry

Build a route manifest at build time from the Next.js `app/` directory:

```typescript
interface RouteManifest {
  routes: RouteEntry[];
}

interface RouteEntry {
  path: string;                    // "/books/ux-design/usability-heuristics"
  title: string;                   // "Usability Heuristics — UX Design"
  type: "page" | "book" | "chapter" | "dashboard" | "auth";
  breadcrumbs: string[];           // ["Books", "UX Design", "Usability Heuristics"]
  requiresAuth: boolean;
  params?: Record<string, string>; // { book: "ux-design", chapter: "usability-heuristics" }
}
```

### 4.2 Semantic Navigation

Accept semantic targets — the LLM doesn't need to know URL structure:

```typescript
{
  name: "navigate",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Direct URL path (e.g., '/books/ux-design/usability-heuristics')"
      },
      target: {
        type: "string",
        enum: ["home", "books", "book", "chapter", "dashboard", "profile", "login"],
        description: "Semantic target type"
      },
      book_slug: { type: "string", description: "Book slug (for book/chapter targets)" },
      chapter_slug: { type: "string", description: "Chapter slug (for chapter target)" },
      section: { type: "string", description: "Section heading to scroll to within the page" },
    },
  },
}
```

**Resolution priority:** If `path` is provided, use it. Otherwise, build the
path from `target` + `book_slug` + `chapter_slug`.

### 4.3 Enhanced Response

```typescript
interface NavigateResponse {
  path: string;
  title: string;
  breadcrumbs: string[];
  requiresAuth: boolean;
  section?: string;                // section to scroll to
  warning?: string;                // "This page requires authentication"
}
```

### 4.4 Route Validation

```text
Valid path → NavigateResponse with full metadata
Invalid path → { error: "Route not found", suggestions: [...closest matches...] }
Auth-required path for ANON → { path, warning: "This page requires authentication. You'll be redirected to login." }
```

### 4.5 Deep Linking

When `section` is provided, the client scrolls to the matching `## heading`:

```text
navigate({ target: "chapter", book_slug: "ux-design", chapter_slug: "usability-heuristics", section: "Visibility of System Status" })
→ navigates to /books/ux-design/usability-heuristics and scrolls to the "Visibility of System Status" heading
```

---

## 5. File Plan

### New Files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/core/entities/themes.ts` | Core | Theme registry with visual properties |
| `src/core/entities/route-manifest.ts` | Core | Route types and validation logic |
| `src/adapters/UIPreferencesRepository.ts` | Adapter | SQLite persistence for UI preferences |
| `scripts/build-route-manifest.ts` | Script | Generate route manifest from app/ directory |

### Modified Files

| File | Change |
| --- | --- |
| `src/core/use-cases/tools/UiTools.ts` | All 3 commands enhanced with validation and rich responses |
| `src/core/use-cases/tools/set-theme.tool.ts` | Updated schema |
| `src/core/use-cases/tools/navigate.tool.ts` | Updated schema with semantic navigation |
| `src/core/use-cases/tools/adjust-ui.tool.ts` | Updated schema with undo/save |
| `src/lib/chat/tool-composition-root.ts` | Wire preference repo and route manifest |

---

## 6. Requirement IDs

### Theme

| ID | Requirement |
| --- | --- |
| UI-THEME-1 | Valid theme returns visual properties (mode, colors, description) |
| UI-THEME-2 | Invalid theme returns error with list of valid themes |
| UI-THEME-3 | Response includes `previous` theme name |
| UI-THEME-4 | Theme registry is a data structure, not hardcoded in command |

### Accessibility / UI

| ID | Requirement |
| --- | --- |
| UI-A11Y-1 | AUTHENTICATED user preferences persist across sessions (SQLite) |
| UI-A11Y-2 | Preset application reports conflicts with existing settings |
| UI-A11Y-3 | Undo reverts to previous settings |
| UI-A11Y-4 | Response includes `previous` values for all changed properties |
| UI-A11Y-5 | Preferences restored on login |

### Navigation

| ID | Requirement |
| --- | --- |
| UI-NAV-1 | Semantic navigation builds correct path from target + slugs |
| UI-NAV-2 | Invalid path returns suggestions (closest matching routes) |
| UI-NAV-3 | Auth-required route warns ANONYMOUS users |
| UI-NAV-4 | Response includes breadcrumbs and page title |
| UI-NAV-5 | Section parameter enables deep-link scrolling |
| UI-NAV-6 | Route manifest is generated at build time |

---

## 7. Test Scenarios

```text
TEST-UI-01: set_theme("dark") → returns properties with mode="dark"
TEST-UI-02: set_theme("nonexistent") → error with valid theme list
TEST-UI-03: adjust_ui({preset: "elderly"}) with existing fontSize="sm" → conflict reported
TEST-UI-04: adjust_ui({undo: true}) → reverts to previous settings
TEST-UI-05: adjust_ui settings persist for AUTHENTICATED user across calls
TEST-UI-06: navigate({target: "chapter", book_slug: "ux-design", chapter_slug: "usability-heuristics"}) → correct path
TEST-UI-07: navigate({path: "/nonexistent"}) → error with suggestions
TEST-UI-08: navigate to auth-required page as ANONYMOUS → warning included
TEST-UI-09: navigate with section → response includes section for client scrolling
TEST-UI-10: Theme registry contains all themes defined in CSS
```

---

## 8. Open Questions

1. **Should theme changes persist for authenticated users?** Currently themes
   are session-only. Persisting in SQLite alongside UI preferences is natural.
2. **Should the route manifest include dynamic routes?** Book/chapter routes
   are dynamic (`/books/[book]/[chapter]`). The manifest needs to enumerate
   all valid combinations from the book content.
3. **Undo depth:** Single undo (one step back) or full undo stack? Single is
   simpler and sufficient for most cases.
4. **Conflict resolution:** When a preset conflicts with manual settings,
   should the preset always win, or should the user be asked? The spec assumes
   preset wins with a warning.

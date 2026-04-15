# QA Report 08 — AI Concierge & Navigation Tools

**Severity range:** P1 High / P2 Medium  
**Scope:** AI assistant integration with admin platform — page context, navigation tools, contextual help.

---

## DEF-051 · P1 High — Only 1 of 4 Navigation Tools Exists

**Spec reference:** spec.md §AI Concierge, Sprint 1  
**Expected tool set:**

| Tool | Purpose | Status |
|------|---------|--------|
| `get_current_page` | Returns current pathname, matched route, page description | ❌ Missing |
| `list_available_pages` | Returns all routes accessible by user's role | ❌ Missing |
| `navigate_to_page` | Enhanced navigate with validation, context, description | ❌ Missing |
| `navigate` | Basic path-only navigation | ✅ Exists |

**File:** `src/core/use-cases/tools/navigate.tool.ts`  
**Current implementation:**
```typescript
export const navigateTool: ToolDescriptor = {
  name: "navigate",
  schema: {
    description: "Navigate to a different page.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  roles: "ALL",
  category: "ui",
};
```

**Problem:** The existing `navigate` tool accepts a raw path string with no validation, no route matching, no description return, and no role-based filtering. It's a blind redirect, not an intelligent navigation assistant.

**Missing capabilities:**
- Cannot tell the user what page they're on
- Cannot list available admin destinations
- Cannot explain what a page does before navigating
- No route validation (accepts any path, including invalid ones)
- No role check (could navigate a non-admin to an admin page that would then 403)

---

## DEF-052 · P1 High — Page Context Injection Is Not Implemented

**Spec reference:** spec.md §AI Concierge — "Page context injection"  
**Expected:** The client sends `currentPathname` in the chat request. The system prompt builder appends `[Current page: /admin/users]` so the LLM always knows the operator's context. Validated against known routes to prevent prompt injection.  
**Actual:** No evidence of `currentPathname` being sent in chat requests. No system prompt injection of page context.

**Search results:** No matches for "currentPathname" injection pattern, no page-context middleware, no system prompt builder that appends page location.

**Impact:** The AI cannot provide contextual help. It cannot say "You're on the users page — want me to change someone's role?" because it has no awareness of where the operator is browsing.

---

## DEF-053 · P2 Medium — No Route Descriptions for AI Awareness

**Spec reference:** spec.md §AI Concierge — "Route descriptions"  
**Expected:** Extend `ShellRouteDefinition` with an optional `description` field. Create a `ROUTE_DESCRIPTIONS` map so the AI can explain any page.  
**Actual:** `ShellRouteDefinition` has a `description` field, but it contains generic text:
- "Admin dashboard" — not helpful for AI context
- "Journal admin" — not descriptive

The `AdminNavigationItem` in `admin-navigation.ts` uses `route.description ?? \`${route.label} admin route.\`` as a fallback, producing generic descriptions like "Users admin route."

**Problem:** The AI needs rich descriptions to be a useful concierge. "Users admin route" tells the AI nothing about what the user can do there. Descriptions should be like: "View and manage all registered users. Change roles, review signup details, manage affiliate status."

---

## DEF-054 · P2 Medium — No Contextual Help Affordance on Admin Pages

**Spec reference:** Sprint 6 §Task 4 — "Contextual help affordance on each admin page"  
**Expected:** Every admin page supports opening chat with page context pre-injected. A help button or affordance triggers the AI with knowledge of what page the admin is on and what actions are available.  
**Actual:** No help button, no contextual chat trigger, no pre-injected prompts on any admin page. The chat FAB (floating action button) exists globally but has no admin page awareness.

**Impact:** The AI-first administration principle requires the AI to be one tap away with full context. Currently, the AI is one tap away (via FAB) but has zero context about the admin surface.

---

## DEF-055 · P2 Medium — Navigate Tool Has No Route Validation

**File:** `src/core/use-cases/tools/navigate.tool.ts`  
**Expected:** Navigation should validate the target path against known routes and the user's role before navigating.  
**Actual:** The tool accepts any string as `path` with no validation:
```typescript
properties: { path: { type: "string" } }
```

**Risks:**
1. AI could navigate to nonexistent routes (404 experience)
2. AI could navigate to routes the user's role cannot access (403 experience)
3. AI could be manipulated into navigating to external URLs if the client-side handler doesn't restrict the path to same-origin
4. No feedback to the AI about whether navigation succeeded

**Recommendation:** Add a `KNOWN_ROUTES` set combining shell routes + admin routes. Validate the path against this set and the user's role. Return an error message to the AI if the route is invalid or unauthorized.

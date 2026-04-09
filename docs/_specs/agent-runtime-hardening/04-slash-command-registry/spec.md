# Slash Command Registry

> **Status:** Draft v0.1
> **Date:** 2026-04-08
> **Scope:** Add a user-facing slash command layer to the OrdoSite chat interface that intercepts `/command` messages before they reach the LLM and dispatches them to specialized handlers. Modeled on the Claude Code CLI's 50+ slash command surface.
> **Dependencies:** [Chat Experience](../../chat-experience/spec.md), [Tool Architecture](../../tool-architecture/spec.md), [RBAC](../../rbac/spec.md), [Conversation Operations And Retention](../../conversation-operations-and-retention/spec.md)
> **Affects:** `src/app/api/chat/stream/route.ts`, `src/lib/chat/stream-pipeline.ts`, chat input UI, `/api/chat/*` route handling
> **Motivation:** OrdoSite chat currently has no power-user escape hatches. Users cannot inspect session state, clear context, export history, switch models, or see token costs without building dedicated UIs for each. Claude Code ships 50+ slash commands through a single dispatch registry — the same pattern applied to a web chat surface would eliminate an entire class of future admin tooling requirements.
> **Requirement IDs:** `SCR-001` through `SCR-099`

---

## 1. Problem Statement

### 1.1 Current State

OrdoSite's chat input is a single text field that routes every message — regardless of prefix or intent — through the full LLM streaming pipeline. There is no intercept layer, no command dispatch, and no user-facing affordance for operating on the session itself. `[SCR-001]`

### 1.2 Verified Gaps

| # | Gap | Impact |
|---|---|---|
| 1 | **No clear-context action** | Users cannot reset the conversation context window without leaving and creating a new conversation. |
| 2 | **No transcript export** | The session's full message history has no user-accessible export path outside the admin panel. |
| 3 | **No in-chat model switching** | Switching the LLM model requires env changes or an admin action. Power users cannot experiment inline. |
| 4 | **No cost visibility** | Token spend for a session is not surfaced anywhere in the chat UI. |
| 5 | **No session status** | Users cannot inspect what context, tools, and routing state the current conversation has active. |
| 6 | **No compact action** | There is no way to request context compaction without ending and restarting a conversation. |

### 1.3 Root Cause

The chat input treats all input as LLM-bound user messages. The system lacks an interception layer that can route structured commands to non-LLM handlers before the streaming pipeline fires. `[SCR-002]`

### 1.4 Why It Matters

Without a command dispatch layer:

- Every power-user action requires a dedicated UI page or admin panel route
- The chat cannot be a first-class operational interface for users who need session inspection or control
- The system accumulates bespoke endpoints instead of a composable command surface

A slash command registry is the canonical solution used in every major chat-interface CLI tool (including the original Claude Code) to solve exactly this problem. `[SCR-003]`

---

## 2. Design Goals

1. **Intercept before LLM.** Any message beginning with `/` must be evaluated by the command registry before it reaches the streaming pipeline. `[SCR-010]`
2. **Composable and role-gated.** Commands are registered independently and carry their own RBAC roles, just like tool descriptors. `[SCR-011]`
3. **Chat-native responses.** Command results are returned as chat messages — not redirects, modals, or toasts — so the conversation remains the primary surface. `[SCR-012]`
4. **No LLM round-trip for pure commands.** Commands that don't require LLM reasoning must resolve and respond without touching Anthropic's API. `[SCR-013]`
5. **Discoverable.** Typing `/` should trigger an autocomplete surface listing available commands for the user's current role. `[SCR-014]`
6. **Extensible.** New commands must be registerable without modifying the dispatch core. `[SCR-015]`
7. **Graceful fallback.** Unknown `/xxx` inputs must produce a helpful error message, not an LLM hallucination about what the command might do. `[SCR-016]`

---

## 3. Architecture

### 3.1 Registry Model

```typescript
export type SlashCommandResult =
  | { type: "chat_message"; content: string }
  | { type: "stream_override"; systemPromptAddendum: string; passthrough: true }
  | { type: "error"; message: string };

export interface SlashCommandDescriptor {
  /** The command name without the leading slash. e.g. "clear" for /clear */
  name: string;
  /** Short description shown in autocomplete and /help output */
  description: string;
  /** Optional usage hint shown in /help */
  usage?: string;
  /** Which roles can use this command. "ALL" = unrestricted. */
  roles: RoleName[] | "ALL";
  /** Execute the command and return a result. */
  execute(args: string, context: SlashCommandContext): Promise<SlashCommandResult>;
}

export interface SlashCommandContext {
  conversationId: string;
  userId: string;
  role: RoleName;
  isAnonymous: boolean;
}

export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommandDescriptor>();

  register(descriptor: SlashCommandDescriptor): void { ... }
  resolve(input: string): { command: SlashCommandDescriptor; args: string } | null { ... }
  getSchemasForRole(role: RoleName): SlashCommandDescriptor[] { ... }
}
```

`[SCR-031]`

### 3.2 Dispatch Flow

```text
user types "/clear all messages"
  → chat input detects leading "/"
  → POST /api/chat/stream with { commandInput: "/clear all messages" }
  OR
  → pre-parse in route handler before LLM dispatch

route handler:
  → parse input for "/" prefix
  → SlashCommandRegistry.resolve("/clear all messages")
    → returns { command: ClearCommand, args: "all messages" }
  → RBAC check: can this role run this command?
  → command.execute("all messages", context)
  → return chat_message result directly as SSE (no Anthropic call)
```

`[SCR-032]`

### 3.3 Intercept Point in `stream-pipeline.ts`

The intercept must happen in `ChatStreamPipeline` before `prepareStreamContext()` is called:

```typescript
// In ChatStreamPipeline or route handler
const commandMatch = slashRegistry.resolve(latestUserText);
if (commandMatch) {
  const rbacOk = slashRegistry.canExecute(commandMatch.command.name, role);
  if (!rbacOk) return errorJson(context, "Permission denied.", 403);
  const result = await commandMatch.command.execute(commandMatch.args, execContext);
  if (result.type === "chat_message") {
    // persist as assistant message, return as SSE delta without LLM call
    return pipeline.returnDirectChatMessage(result.content, context);
  }
  // stream_override: inject addendum and fall through to LLM normally
}
```

`[SCR-033]`

### 3.4 Initial Command Set

Modeled on Claude Code's documented slash command surface, translated to OrdoSite's web context:

| Command | Args | Roles | Description |
|---|---|---|---|
| `/help` | `[command]` | ALL | List available commands or describe one |
| `/clear` | none | ALL | Compact/reset the context window for this conversation |
| `/export` | `[format]` | ALL | Download the conversation as Markdown or JSON |
| `/cost` | none | ALL | Show token usage and estimated cost for this session |
| `/status` | none | ALL | Show active routing lane, tool pool, and context stats |
| `/model` | `[model-id]` | ADMIN, OPERATOR | Show or switch the LLM model for this session |
| `/memory` | none | ALL | Show the current system prompt context summary |
| `/compact` | none | ALL | Summarize conversation history to free context space |
| `/resume` | `[session-id]` | ALL | Load a previously saved session by ID |
| `/config` | none | ADMIN | Show the active runtime configuration |

`[SCR-034]`

### 3.5 Autocomplete Surface

The chat input must detect the `/` prefix and trigger an autocomplete dropdown:

1. Filter `SlashCommandRegistry.getSchemasForRole(role)` by partial match on the typed prefix
2. Render matching commands with name + description
3. On selection, replace input with the full command name + space
4. `Escape` dismisses without clearing

The autocomplete list must be filtered to the current user's role — anonymous users must not see admin-only commands. `[SCR-035]`

### 3.6 `/help` and Error Responses

All command responses must be rendered as standard chat assistant messages — same bubble, same markdown rendering, same scroll behavior.

`/help` output format:

```
**Available commands**

/clear — Reset the context window for this conversation
/export [format] — Download conversation as Markdown or JSON
/cost — Show token usage for this session
...

Type `/help <command>` for detailed usage.
```

Unknown command response:

```
Unknown command: /foo

Type /help to see available commands.
```

`[SCR-036]`

---

## 4. Security And Access

1. **RBAC gates every command.** Commands carry explicit role lists; the registry enforces them before `execute()` is called. `[SCR-040]`
2. **Anonymous users get a restricted set.** Only `ALL`-role commands are available to anonymous sessions. `[SCR-041]`
3. **No command bypasses session ownership.** Commands that touch conversation state (e.g., `/export`, `/clear`) must validate that the requesting user owns the target conversation. `[SCR-042]`
4. **Model switching is admin-only.** The `/model` command must be gated to ADMIN/OPERATOR roles and log the change to the analytics stream. `[SCR-043]`
5. **Export payloads are sanitized.** The `/export` command must strip any internal metadata (system prompt secrets, tool execution traces) from the returned download. `[SCR-044]`
6. **Command names are validated strictly.** The registry must reject registrations with empty names, names containing spaces, or names that shadow existing commands. `[SCR-045]`

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Registry resolution | 8 | Parse `/name args`, unknown commands, case-insensitivity |
| RBAC gates | 6 | Role-allowed, role-denied, ALL-role passthrough |
| `/help` output | 4 | Full list, single command, unknown command error |
| `/clear` logic | 4 | Context window reset, conversation ownership check |
| `/export` logic | 6 | Markdown format, JSON format, sanitization, ownership |
| `/cost` logic | 4 | Token sum display, anonymous session handling |
| `/status` logic | 4 | Active lane, tool pool, context stats |

### 5.2 Integration Tests

| Area | Estimated Count | What's Tested |
|---|---|---|
| Intercept before LLM | 5 | `/clear` resolves without Anthropic call |
| Chat-native response | 5 | Command result renders as assistant message in conversation |
| Autocomplete filtering | 4 | Role-appropriate list returned for prefix match |
| Unknown command graceful error | 3 | Returns error message, does not 500 |
| Anonymous session restriction | 3 | Admin commands produce denied message not error page |

### 5.3 Existing Test Preservation

All non-slash-prefixed messages must continue to route through the existing LLM pipeline unchanged. The intercept layer must be a prefix gate only. `[SCR-050]`

---

## 6. Sprint Plan

| Sprint | Name | Goal | Estimated Tests |
|---|---|---|---|
| **0** | **Registry Core** | Define `SlashCommandRegistry`, `SlashCommandDescriptor`, `SlashCommandContext`, and dispatch intercept in `stream-pipeline.ts`. | +22 |
| **1** | **Initial Command Set** | Implement `/help`, `/clear`, `/export`, `/cost`, `/status`, `/memory`. | +20 |
| **2** | **Autocomplete UI** | Add `/` autocomplete dropdown in chat input, role-filtered, keyboard-navigable. | +12 |
| **3** | **Admin Commands + Hardening** | Implement `/model`, `/config`, `/compact`, `/resume`. Add logging and audit trail. | +14 |

---

## 7. Future Considerations

1. Plugin-provided commands — allow MCP tools or corpus bundles to register additional slash commands.
2. Slash command history — up-arrow to cycle through previously used commands.
3. Parameterized completions — autocomplete arguments for commands that accept structured inputs.
4. `/task` command — create a tracked background job from chat without a full tool call.
5. `/plan` command — enter a planning mode that stages actions before executing.

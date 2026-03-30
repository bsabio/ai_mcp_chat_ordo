# 02 Capabilities: The 41+ Tool Catalog

The Ordo System is defined by its **Capabilities**, not its UI. Every major feature is exposed as a tool to the AI.

## Category: UI & Navigation
These tools allow the AI to control the user's browser view and aesthetic experience.

| Tool Name | Purpose | Key File |
| :--- | :--- | :--- |
| `set_theme` | Changes the site era (Bauhaus, Swiss, etc.). | `set-theme.tool.ts` |
| `adjust_ui` | Tweaks density, dark mode, font size. | `adjust-ui.tool.ts` |
| `navigate` | Pushes the browser to a new URL. | `navigate.tool.ts` |

## Category: Content & Knowledge (Corpus)
These tools give the AI access to the local and external knowledge base.

| Tool Name | Purpose | Key File |
| :--- | :--- | :--- |
| `search_corpus` | Full-text search of the document library. | `search-corpus.tool.ts` |
| `get_corpus_summary` | High-level summary of a specific corpus. | `get-corpus-summary.tool.ts` |
| `admin_web_search` | External search through Google/Tavily. | `admin-web-search.tool.ts` |

## Category: Visualization & Data
Tools that generate rich, interactive artifacts in the chat stream.

| Tool Name | Purpose | Key File |
| :--- | :--- | :--- |
| `generate_graph` | Creates a force-directed graph UI component. | `generate-graph.tool.ts` |
| `generate_chart` | Renders Mermaid.js charts (Gantt, Pie, Flow). | `generate-chart.tool.ts` |

## Category: System & Admin
Internal governance and long-running job management.

| Tool Name | Purpose | Key File |
| :--- | :--- | :--- |
| `get_my_job_status` | Inspects the state of a deferred task. | `deferred-job-status.tool.ts` |
| `admin_triage_routing_risk` | Analyzes conversation metadata for risks. | `admin-triage-routing-risk.tool.ts` |

---

## Tool Execution Context
Every tool receives a `ToolExecutionContext`:
- `userId`: The ID of the acting user.
- `role`: (ADMIN, STAFF, APPRENTICE, etc.) - **Enforced globally by RBAC.**
- `conversationId`: The active chat context.

---
*Reference for agents: Always check the `roles` property in `ToolDescriptor` before assuming a tool is available to all users.*

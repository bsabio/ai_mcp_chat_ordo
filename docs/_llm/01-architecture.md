# 01 Architecture: The Clean Core

The Ordo system follows a strict **Clean Architecture** (Ports & Adapters) pattern. This provides a deterministic "SLOT" for every piece of computer logic.

## The Direction of Dependency
Dependencies always flow **inward** toward the `src/core`.

| Layer | Responsibility | Key Sources |
| :--- | :--- | :--- |
| **Core (Entities)** | Pure data structures and business types. | `src/core/entities` |
| **Core (Use Cases)** | Interactors and Tool Commands. | `src/core/use-cases` |
| **Adapters** | Presenters, DataMappers, and Controller logic. | `src/adapters` |
| **Frameworks** | Next.js components, Database drivers, and LLM APIs. | `src/frameworks`, `src/app` |
| **Library** | Low-level utilities and orchestration. | `src/lib` |

---

## The Chat Loop Flow
When a user sends a message, it follows this predictable path:

1.  **Entry**: `app/api/chat/route.ts` receives the POST request.
2.  **Facilitation**: `lib/chat/chat-turn.ts` initializes the `ToolRegistry`.
3.  **Authentication**: `lib/chat/resolve-user.ts` identifies the role (ADMIN, STAFF, etc.).
4.  **REPL Orchestration**: `lib/chat/orchestrator.ts` starts a loop (up to 6 turns).
    *   **LLM Choice**: LLM decides to call a tool (e.g., `set_theme`).
    *   **Registry Execution**: `core/tool-registry/ToolRegistry.ts` runs the command.
    *   **Feedback**: Results are sent back to the LLM.
5.  **Streaming**: Response is streamed to the client via `lib/chat/anthropic-stream.ts`.

## Key System Ports
- [ConversationRepository](file:///Users/kwilliams/Projects/is601_demo/src/core/use-cases/ConversationRepository.ts)
- [MessageRepository](file:///Users/kwilliams/Projects/is601_demo/src/core/use-cases/MessageRepository.ts)
- [JobStatusQuery](file:///Users/kwilliams/Projects/is601_demo/src/core/use-cases/JobStatusQuery.ts)

---
*Reference for agents: Always use the Interactor in core/use-cases rather than direct DB access.*

# Architectural Debt Manifest

This manifest categorizes systemic architectural issues in OrdoSite, ranging from boundary violations to excessive complexity.

---

## 1. Clean Architecture Violations (Core Leaks)

The **Core Domain** should be infrastructure-agnostic. Currently, several interactors leak into the adapter/implementation layer.

| Component | Issue | Severity |
| --- | --- | --- |
| `UserAdminInteractor.ts` | Imports `UserDataMapper` (Adapter) directly. | High |
| `SearchHandlerChain.ts` | Direct coupling with `HybridSearchEngine` implementation rather than just ports. | Medium |
| `CorpusTools.ts` | Direct dependency on `RepositoryFactory` (Adapter implementation) for wiring. | Medium |

---

## 2. Structural Concentration (God Modules)

Several files have grown beyond manageable thresholds (>500 lines), indicating a concentration of too many responsibilities.

| File | Responsibilities | Recommendation |
| --- | --- | --- |
| `src/lib/chat/stream-pipeline.ts` | Request validation, stream lifecycle, tool coordination, persistence. | Decompose into `StreamOrchestrator`, `RequestValidator`, and `ToolExecutionRunner`. |
| `src/adapters/ChatPresenter.ts` | Formatting of messages, parts, tool results, and UI hints. | Split into specialized formatters for different part types. |
| `src/frameworks/ui/MessageList.tsx` | Rendering conversation turns, tool results, stream status, and attachments. | Decompose into smaller sub-components (`TurnRenderer`, `PartRenderer`). |

---

## 3. UI/Core Logic Entanglement

Logic that defines how something is *rendered* is leaking into `src/core`, which should only handle *what* is being presented.

| File | Issue | Severity |
| --- | --- | --- |
| `src/core/use-cases/tools/graph-payload.ts` | Contains structured data logic that is highly coupled with `GraphRenderer.tsx`. | Medium |
| `src/core/tool-registry/RoleAwareSearchFormatter.ts` | Formatting logic that includes UI-specific labels and highlighting. | Low |

---

## 4. State Management Invariants

- **Context Window Drift**: The prompt window trimming logic in `context-window.ts` is deterministic but doesn't guarantee that the model receives enough context for long-range reasoning without summarization.
- **Race conditions**: The "Ghost DOM" race condition identified in previous audits is still present in the `useChatSend` flow, where the URL updates faster than the DOM snapshot.

---

## 5. Summary of Recommended Remediations

1. **Invert Dependencies**: Use ports (interfaces) in all Core interactors. Inject implementations into the Composition Root.
2. **Decompose god-modules**: Prioritize splitting `stream-pipeline.ts` as it is the most critical and complex part of the system.
3. **Formalize Presenters**: Move all "role-aware" formatting into the `adapters` layer, keeping the `core` focused on pure domain results.

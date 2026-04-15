# 09 Service Lifetime And Control-Plane Seams
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document covers two closely related areas:

- how the repo currently constructs long-lived and request-scoped services
- how prompt mutations and prompt-visible runtime behavior are controlled through different paths

These are both control-plane issues. They shape whether runtime behavior can be reasoned about from one place.

## 1. Mixed Lifetime Model

The repository uses both request-scoped construction and process-cached service-locator construction.

Neither style is inherently wrong. The issue is that the boundary between them is not yet systematic.

## 2. Request-Scoped Construction In `conversation-root`

`src/lib/chat/conversation-root.ts` builds conversation-facing services by creating fresh repository objects around the shared DB handle and returning fresh interactors.

That file currently constructs:

- `ConversationInteractor`
- `SummarizationInteractor`
- workflow interactors for leads, consultations, deals, and training paths
- a fresh `ConversationEventRecorder`
- a fresh `AnthropicSummarizer`

### What this model gets right

- request and route code can get cleanly assembled use-case objects
- event recording is explicit rather than hidden behind a global singleton
- conversation-facing orchestration is readable at the composition point

### What this model implies

Service lifetime is meant to be relatively local around route execution.

## 3. Process-Cached Construction In `RepositoryFactory`

`src/adapters/RepositoryFactory.ts` uses module-level variables as a service locator for many data mappers and queries.

That file caches:

- corpus repository
- blog repositories
- job queue repository and job status query
- push subscription repository
- user, lead, consultation, deal, and training-path data mappers
- system prompt data mapper
- conversation, message, and event data mappers

Only the job queue repository explicitly checks whether the DB handle changed and invalidates its cached query object. Most of the other cached repositories do not.

### Important implication

The repo currently mixes two ideas:

- some services should be rebuilt near the request
- some services should effectively live for the life of the process

Because the distinction is not formalized, the same feature can use both models at once.

## 4. Where The Lifetime Model Splits In Practice

Current routes and features regularly cross the boundary.

Examples:

- chat stream routes use request-scoped conversation services but global job query accessors
- chat events and chat jobs routes use `createConversationRouteServices()` for authorization and `getJobQueueRepository()` for event and snapshot reads
- admin prompt surfaces use the repository factory directly
- tool bundles often reach for cached query objects through the service locator

### Important implication

The actual dependency graph is not visible from a single composition root. It is assembled partly by constructor wiring and partly by globally reachable getters.

That makes lifetime reasoning harder than it needs to be.

## 5. In-Memory Runtime State Adds Another Lifetime Class

There is also a third lifetime model: in-memory runtime coordination.

`active-stream-registry.ts` stores active chat stream ownership in a process-local map. That registry is neither request-scoped nor durable. It lives only inside the current server process.

### Important implication

The system currently spans three lifetime classes at once:

- request-scoped use-case construction
- process-cached repository singletons
- process-memory coordination state

That is workable on a single long-lived Node process, but it is an architectural seam when reasoning about scale, restarts, or concurrency.

## 6. Prompt Runtime Construction

Prompt assembly has its own mixed control plane.

`src/lib/chat/policy.ts` currently does all of the following:

- caches a base identity string in module scope
- reads that identity from `ConfigIdentitySource`
- constructs a fresh `SystemPromptDataMapper`
- wraps it in `DefaultingSystemPromptRepository`
- resolves DB-backed base and role prompts
- composes them with page context through `SystemPromptBuilder`

### Important implication

The final runtime system prompt is already a merged artifact from two different ownership models:

- config-owned identity and personality data
- DB-owned role and base prompt versions

The system does not currently store or administer that final merged prompt as one first-class object.

## 7. Config Identity Is Cached Separately From Prompt Versions

The base identity string is cached in module scope inside `policy.ts`.

That means:

- DB prompt activation changes are picked up dynamically on later requests
- config identity changes depend on process refresh rather than the same prompt version mechanism

### Important implication

Two parts of the effective system prompt have different freshness and audit semantics even before any admin mutation path is considered.

## 8. Admin Prompt Mutations And MCP Prompt Mutations Are Not Equivalent

The prompt control plane currently has at least two different mutation behaviors.

### Admin prompt path

The admin prompt actions:

- create prompt versions through `SystemPromptDataMapper`
- activate prompt versions through `SystemPromptDataMapper`
- revalidate admin routes afterward

The admin create action does not activate automatically. The activate action flips the DB state but does not emit any conversation event describing the prompt change.

### MCP prompt path

The MCP prompt tool:

- creates a new version
- activates it
- emits `prompt_version_changed` events for active conversations of the affected role
- supports rollback and diff operations in the same tool surface

### Important implication

The same prompt table can be mutated through two different control planes with different side effects.

That is a stronger form of drift than mere duplicate UI. It means behavior differs depending on which mutation surface was used.

## 9. Prompt Mutation Validation Also Differs

The MCP rollback path checks that the target version exists before activation.

The admin activation path validates only that the submitted version is a positive integer before calling `activate`. The data mapper itself does not reject a missing version explicitly.

### Important implication

Even when both paths are manipulating the same underlying version records, they are not enforcing the same mutation contract.

## 10. What Currently Works Well

- The prompt table itself is versioned, role-scoped, and durable.
- The runtime prompt builder clearly separates identity, directive, and page-context sections.
- The fallback repository prevents missing DB prompt rows from breaking the chat runtime.
- The MCP prompt tool already models a richer prompt control plane with list, get, set, rollback, and diff behavior.

## 11. Where The Current Design Is Fragile

### 11.1 Dependency lifetime is not systematic

The repo does not yet define which services should be request-scoped, process-cached, or durable-runtime coordinated. That makes hidden coupling more likely.

### 11.2 Prompt administration is not the same as prompt runtime

The admin surface exposes only DB-backed prompt versions. The runtime prompt also depends on config identity, which is cached separately and not managed through the same workflow.

### 11.3 Prompt mutation side effects depend on the entrypoint

The MCP prompt tool emits conversation events. The admin prompt path does not. That means operational observability of prompt changes is currently surface-dependent.

### 11.4 Composition roots are partial

`conversation-root.ts` acts like a composition root for some use cases. `RepositoryFactory.ts` bypasses that pattern for many others. The result is a mixed model rather than a single dependency policy.

## 12. Architectural Reading

The current repo already contains the pieces needed for a better control plane:

- versioned prompts
- explicit prompt builder sections
- route-scoped use-case composition
- event recording

The missing piece is unification.

Today, service lifetimes and prompt mutations are both governed by multiple partial policies instead of one architectural contract. That is why these seams are reliable enough to operate, but still difficult to reason about holistically.
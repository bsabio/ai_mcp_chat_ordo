# Sprint 0 Baseline Inventory

> **Status:** Frozen on 2026-04-11
> **Sources:** `release/runtime-inventory.json`,
> `release/runtime-integrity-evidence.json`,
> `src/core/entities/user.ts`, `src/lib/db/seeds.ts`,
> `src/lib/admin/prompts/admin-prompts.ts`, `mcp/prompt-tool.ts`, and the
> unification research set.

This document freezes the current baseline the unification program will be
measured against.

## 1. Runtime Role And Capability Baseline

### 1.1 Runtime role inventory

Current runtime role inventory from `RoleName`:

- `ANONYMOUS`
- `AUTHENTICATED`
- `APPRENTICE`
- `STAFF`
- `ADMIN`

### 1.2 Capability counts by role

Current governed runtime inventory baseline from
`release/runtime-inventory.json` and `release/runtime-integrity-evidence.json`:

| Role | Tool count |
| --- | --- |
| `ANONYMOUS` | 10 |
| `AUTHENTICATED` | 25 |
| `APPRENTICE` | 25 |
| `STAFF` | 25 |
| `ADMIN` | 54 |

### 1.3 Corpus baseline

Current corpus baseline from the same runtime inventory artifacts:

| Item | Value |
| --- | --- |
| Corpus name | `Second Renaissance Knowledge System` |
| Document count | 10 |
| Section count | 87 |
| Route base | `/library` |

## 2. Prompt Coverage Baseline

### 2.1 DB-backed seed coverage

Current prompt seeds in `src/lib/db/seeds.ts` provide:

| Slot | Seeded now |
| --- | --- |
| `ALL / base` | yes |
| `ALL / role_directive` | no |
| `ANONYMOUS / role_directive` | yes |
| `AUTHENTICATED / role_directive` | yes |
| `APPRENTICE / role_directive` | no |
| `STAFF / role_directive` | yes |
| `ADMIN / role_directive` | yes |

### 2.2 Runtime fallback coverage

Current runtime fallback coverage is broader than the DB seed set because:

- `DefaultingSystemPromptRepository` returns fallback content when no active DB
  row exists
- `ConfigIdentitySource` provides effective base identity content
- `ROLE_DIRECTIVES` includes `APPRENTICE`

That means runtime prompt coverage already includes `APPRENTICE` even though the
DB seed set does not.

### 2.3 Control-plane coverage

Current prompt-control surfaces enumerate roles differently from runtime truth:

| Surface | Default role list |
| --- | --- |
| Admin prompt loaders | `ALL`, `ANONYMOUS`, `AUTHENTICATED`, `STAFF`, `ADMIN` |
| MCP `prompt_list` default enumeration | `ALL`, `ANONYMOUS`, `AUTHENTICATED`, `STAFF`, `ADMIN` |
| Runtime prompt truth | `ALL` base plus runtime roles `ANONYMOUS`, `AUTHENTICATED`, `APPRENTICE`, `STAFF`, `ADMIN` |

### 2.4 Frozen prompt drift statement

As of this baseline:

1. stored prompt versions are not equivalent to effective runtime prompts
2. `APPRENTICE` is a real runtime role but not fully represented in the current
   DB seed and control-plane defaults
3. admin and MCP prompt mutation surfaces are not side-effect equivalent
4. `prompt_version_changed` is currently a slot-version event, not a full
  effective-prompt change event
5. config identity freshness is governed separately from DB prompt-version
  changes because `policy.ts` caches the base identity text in module scope

## 3. Provider Path Baseline

Current model-backed provider paths:

| Use case | Current path |
| --- | --- |
| Main chat stream | `src/lib/chat/anthropic-stream.ts` |
| Direct chat turn | `src/lib/chat/chat-turn.ts` + `src/lib/chat/anthropic-client.ts` + `src/lib/chat/orchestrator.ts` |
| Live eval runtime | `src/lib/evals/live-runtime.ts` + `src/lib/evals/live-runner.ts` |
| Summarization | `src/adapters/AnthropicSummarizer.ts` |
| Blog article pipeline | `src/lib/blog/blog-production-root.ts` + `src/adapters/AnthropicBlogArticlePipelineModel.ts` |
| Blog image generation | `src/adapters/OpenAiBlogImageProvider.ts` |
| Admin web search | `src/core/use-cases/tools/admin-web-search.tool.ts` + `mcp/web-search-tool.ts` |
| TTS | `src/app/api/tts/route.ts` |

Frozen baseline statement:

- chat stream and direct-turn chat do not yet share one provider-policy runtime
- non-chat model-backed paths each still solve provider policy locally

## 4. Chat Event, Deferred-State, And Stop Baseline

Current job and deferred-state publication paths:

| Channel | Current role |
| --- | --- |
| `/api/chat/stream` | main SSE stream with promoted deferred-job events |
| `/api/chat/events` | separate job-event EventSource path |
| `/api/chat/jobs` | snapshot reconciliation path |
| browser-side rewrites | job-shaped UI state created from tool results in the browser |

Frozen baseline statement:

- deferred job state is useful and functional, but still converges from multiple
  channels rather than one authoritative publication path
- stop semantics are narrower than the UI can imply: active-stream ownership is
  process-local and stopping a live stream does not cancel already queued
  deferred jobs
- some important runtime state, such as stream identity and generation terminal
  state, is still tracked partly outside persisted reducer state

## 5. Service Lifetime Baseline

Current service lifetime classes:

| Lifetime class | Current examples |
| --- | --- |
| Request-scoped construction | `conversation-root.ts` conversation services and interactors |
| Process-cached repositories and queries | `RepositoryFactory.ts` data mappers, repositories, and query objects |
| Process-memory coordination state | `active-stream-registry.ts` |

Frozen baseline statement:

- the repo currently mixes request-scoped, process-cached, and process-memory
  coordination layers without one explicit ownership policy
- the dependency graph is only partially visible from composition roots

## 6. MCP Boundary Baseline

Current MCP boundary facts frozen from the research set:

1. the main chat runtime is not MCP-first
2. parts of the application import `mcp/*` modules directly as shared internal
   code
3. `mcp/embedding-server.ts` is a mixed-purpose operational server, not only an
   embeddings boundary

Frozen baseline statement:

- the repo currently uses `mcp/` both as a protocol surface and as a shared
  module namespace

## 7. Testing Reality Baseline

Current high-value mocked seams identified in the research set:

- `@/lib/chat/policy`
- `@/lib/chat/anthropic-stream`
- `@/lib/chat/chat-turn`
- `@/lib/chat/conversation-root`
- `@/adapters/RepositoryFactory`

Frozen baseline statement:

- the current suite is stronger at local-module behavior than at integrated
  seam behavior
- passing route tests do not currently guarantee unified prompt, provider, or
  composition behavior

## 8. Current Governance And Release Baseline

### 5.1 Existing governance commands

Current reusable governance and release commands from `package.json`:

- `npm run scan:secrets`
- `npm run runtime:inventory`
- `npm run qa:runtime-integrity`
- `npm run release:evidence`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run quality`

### 5.2 Existing governed release artifacts

Current evidence artifacts already present in the repo:

- `release/runtime-inventory.json`
- `release/runtime-integrity-evidence.json`
- `release/qa-evidence.json`
- `release/manifest.json`

### 5.3 Current contributor policy baseline

Current public contributor posture from `README.md` and `CONTRIBUTING.md`:

- the repository is open-source
- issues and bug reports are welcomed
- code pull requests are intentionally not accepted at this stage

### 5.4 Current deployment-knowledge baseline

Current repo memory and deployment notes still include operational knowledge that
must not silently remain a prerequisite for a public release, including:

- image composition details required for `mcp/` runtime files
- deployment commands specific to the production host
- server-specific environment and compose assumptions

Those facts can remain documented operationally, but they cannot be allowed to
define the public quick-start contract.

## 9. Baseline Risks To Carry Forward

The program should treat the following as frozen starting risks:

1. prompt truth is split across storage, fallback, config overlay, and
   request-time sections
2. provider policy is duplicated across chat and non-chat paths
3. capability metadata is not yet derived from one source of truth
4. deferred state is converged after the fact across multiple channels
5. seam-level tests remain weaker than local-module tests
6. public-release readiness depends on architecture and governance alignment,
   not only on build success
7. service lifetime policy is still implicit rather than explicit
8. MCP boundary narratives can drift away from the actual runtime boundary if
  docs are not kept strict

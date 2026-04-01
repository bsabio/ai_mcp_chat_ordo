# Studio Ordo Performance Improvement Assessment

## Executive Summary

Studio Ordo does not look like a product that needs a Rust rewrite to become fast.
The current latency and responsiveness risks are much more likely to come from
orchestration choices than from JavaScript itself.

The highest-leverage improvements are:

1. move more slow or high-variance work out of the synchronous chat turn
2. parallelize the safe read-only tool calls that are currently executed serially
3. add small, explicit cache layers around repeated search and tool work
4. improve perceived speed with immediate status updates, stronger deferred-job UX,
   and lightweight operator presence
5. enforce human takeover in the runtime, not only in the admin surface

For the current single-node, solopreneur-oriented product shape, that sequence is
more rational than a language rewrite. If the system later outgrows SQLite and the
single-node invariant, PostgreSQL is the more important architectural move before
any large Rust migration.

## Current Runtime Shape

The repository is already explicit about its runtime model:

- chat is the primary interface and `/api/chat/stream` is the main request path
- the app runs on Next.js with `better-sqlite3`
- deferred jobs run in a separate worker process
- the system is designed around a single-node invariant today

Relevant sources:

- `README.md`
- `docs/operations/system-architecture.md`
- `docs/operations/single-node-invariant.md`
- `docs/operations/process-model.md`
- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/anthropic-stream.ts`
- `src/lib/jobs/deferred-job-runtime.ts`
- `src/lib/jobs/deferred-job-worker.ts`

That foundation is actually good for a small, controlled operator product. The
system is already disciplined enough that meaningful optimization can happen
without a ground-up rewrite.

## What The Code Suggests Is Slow

### 1. The chat turn still carries too much synchronous responsibility

The `/api/chat/stream` route resolves session state, validates input, loads user
preferences, builds the system prompt, ensures a conversation, persists the user
message, runs routing analysis, builds context, wires the tool executor, and only
then starts the model stream.

Relevant sources:

- `src/app/api/chat/stream/route.ts`
- `src/lib/chat/stream-pipeline.ts`
- `src/lib/chat/conversation-root.ts`
- `src/lib/chat/policy.ts`

None of these steps are individually outrageous, but together they create a
fatter critical path than a "hyper-responsive" chat surface wants.

### 2. Tool calls inside a model turn are executed serially

The Anthropic loop in `runClaudeAgentLoopStream()` processes `tool_use` blocks in
sequence:

- it iterates `for (const use of toolUseBlocks)`
- it `await`s each `toolExecutor(use.name, args)`
- only after all tool results are gathered does it continue the loop

Relevant source:

- `src/lib/chat/anthropic-stream.ts`

This is a major latency multiplier. If the model emits multiple safe read-only
tool calls in one round, the runtime currently pays the full sum of their
latencies instead of something closer to the maximum of their latencies.

### 3. Deferred execution exists, but it is still narrow and editorial-heavy

Deferred jobs are a real system here, which is good. But the live deferred
handlers are almost entirely editorial/blog operators and are mostly admin-only.

Relevant sources:

- `src/lib/jobs/deferred-job-handlers.ts`
- `src/lib/jobs/job-capability-registry.ts`

This means many user-visible latency spikes are still likely to happen inline,
because the deferred model is not yet being used as a broad responsiveness tool.

### 4. Job updates are delivered through polling-style SSE, not push-driven fanout

The job event stream route keeps an SSE connection open, but the server side is
implemented as a poll loop:

- default poll interval is `500ms`
- default stream window is `25_000ms`
- the stream repeatedly queries the repository for new events

Relevant source:

- `src/app/api/chat/events/route.ts`
- `src/lib/jobs/job-event-stream.ts`

This is acceptable for a single-node MVP, but it is not the most efficient way
to make the UI feel instant.

### 5. The worker is reliable, but not optimized for lowest-latency job pickup

The deferred runtime polls every `2000ms` by default and processes one claimed
job at a time per loop.

Relevant sources:

- `src/lib/jobs/deferred-job-runtime.ts`
- `scripts/process-deferred-jobs.ts`

For a solopreneur product, that is a reasonable reliability default. But it also
means the queue can feel sluggish for tasks that users perceive as "should start
right away" background work.

### 6. Retrieval is still doing full in-process scoring work

The hybrid search path is not using an ANN index or a database-native vector
ranking primitive. It loads passage embeddings from SQLite and scores them in the
process.

Relevant sources:

- `src/lib/chat/search-pipeline.ts`
- `src/core/search/HybridSearchEngine.ts`
- `src/adapters/SQLiteVectorStore.ts`

`SQLiteVectorStore.getAll()` reads all matching embeddings for the query, and the
engine computes similarity in memory. That is workable at current scale, but it
is a clear place where latency can creep upward as the corpus grows.

### 7. Human takeover exists in admin UX, but does not appear enforced in chat runtime

There is a takeover/hand-back action that flips `conversation_mode` and writes a
system message.

Relevant sources:

- `src/app/admin/conversations/[id]/page.tsx`
- `src/lib/admin/conversations/admin-conversations-actions.ts`
- `src/adapters/ConversationDataMapper.ts`

However, the active chat runtime does not appear to check `conversation_mode`
before running `/api/chat/stream`. A simple repo search shows the mode is used in
the admin surface, but not in the live stream route.

That matters because "human takeover" is not only a UX idea. It is also a
latency and trust contract. If a founder/operator takes over, the system should
stop routing that thread through the AI path immediately.

### 8. Presence and operator online status are largely absent

I do not see a real presence system or heartbeat-based operator availability
surface in the active runtime. The repo contains specs discussing heartbeat and
takeover, but not an implemented presence primitive for live operator status.

That is a product gap more than a systems gap, but it affects perceived speed.
If users know a human is online and can take over, they tolerate deferred work
much better.

## What Is Already Good

The codebase already has some useful performance discipline:

- `src/lib/chat/tool-composition-root.ts` caches registry composition
- `src/lib/config/instance.ts` caches instance config
- `src/adapters/CachedCorpusRepository.ts` caches corpus reads
- `src/lib/corpus-library.ts` caches corpus indexes
- `src/adapters/LocalEmbedder.ts` keeps a singleton local embedding pipeline
- `src/app/api/tts/route.ts` caches generated audio in the user-file store
- `docs/operations/single-node-invariant.md` is explicit about deployment shape

This is important because it means the repo is not naive. The problem is not
"there is no caching anywhere." The problem is that the most expensive
user-visible path, chat plus tool execution, still has too much inline work and
too few latency-oriented shortcuts.

## Recommended Direction For A Solopreneur Product

## Phase 1: Easy Wins

These are the first changes I would make.

### 1. Add real latency instrumentation before changing architecture

Track at least these timings per chat turn:

- request received to first SSE byte
- request received to first text delta
- request received to first tool call
- per-tool execution time by tool name
- total tool round count per request
- request received to final stream close
- queue wait time for deferred jobs
- job start to job completion

Store the measurements in a small SQLite table or structured logs. For this repo,
that is enough. Do not start with a heavy observability stack.

Why first:

- it tells you whether the pain is provider time, tool time, routing/prompt prep,
  or queue delay
- it prevents cargo-cult optimization

### 2. Split tools into "must be inline" and "should default to deferred"

Right now the deferred architecture is strongest around editorial work. Expand
the classification model.

Keep inline:

- tiny UI tools
- cheap preference tools
- fast navigation helpers
- small deterministic lookups

Prefer deferred:

- web search
- multi-step content transforms
- image generation
- long corpus transforms
- any tool with provider latency or variable external IO

The existing `executionMode` contract in `ToolDescriptor` is already the right
seam for this.

Relevant source:

- `src/core/tool-registry/ToolDescriptor.ts`

### 3. Parallelize safe read-only tool calls within a single tool round

This is probably the single highest-value runtime improvement.

The current agent loop executes tool blocks serially. Change the loop so that:

- read-only, independent tool calls can run with `Promise.all`
- mutating tools still run serially
- tools that depend on previous tool output stay serial

This does not require a new language. It requires a small execution planner.

Good first policy:

- add `parallelSafe: true | false` metadata to tool descriptors
- only parallelize tools marked `parallelSafe: true`
- keep a conservative allowlist at first

### 4. Reduce job-start lag

For a founder/operator product, users strongly feel the difference between a job
starting in `100ms` and starting in `2s`.

Pragmatic improvements:

- lower `DEFERRED_JOB_POLL_INTERVAL_MS` for local production
- immediately trigger a worker wake-up after enqueue on the same node
- keep the queue as source of truth, but do not wait for the next poll cycle if
  the worker can be nudged directly

You do not need distributed queues for this. On one host, a lightweight internal
signal is enough.

### 5. Make the UI feel faster before the backend is faster

Perceived speed matters here.

Add explicit immediate UI states:

- "thinking"
- "checking tools"
- "searching corpus"
- "queued for background work"
- "operator available"

The stream already emits structured tool and job events. Lean into that. The user
should never be staring at a blank wait state.

### 6. Add small response caches where the same work repeats often

Do not start with a giant generalized cache. Start with narrow, high-hit-rate
targets:

- normalized corpus search query + role + corpus version
- conversation search results for repeated identical queries
- repeated job-status reads
- expensive tool results that are pure and read-only

Keep cache keys explicit and attach TTLs. In this repo, SQLite-backed or
process-local caches are enough for the current deployment shape.

### 7. Warm important local resources on boot

The local embedding pipeline is singleton-based, which is good, but it is still a
lazy first-use cost center.

Relevant source:

- `src/adapters/LocalEmbedder.ts`

For a solopreneur product, I would warm this during boot or in a non-blocking
startup task if corpus search is part of the core experience.

## Phase 2: Product Responsiveness Fixes

These matter because the user is not only judging raw latency. They are judging
whether the system feels alive, governed, and interruptible.

### 1. Enforce human takeover in `/api/chat/stream`

If a conversation is in human mode, the AI runtime should not continue as if
nothing happened.

Recommended behavior:

- load conversation mode before beginning the stream
- if mode is `human`, reject AI send with a clear status payload or convert the
  send into a human-waiting state
- reflect that state in the chat UI immediately

That makes takeover real and prevents the "AI is still talking while the founder
has taken over" failure mode.

### 2. Add minimal operator presence

Because the repo is intentionally single-node today, presence can stay simple.

Suggested model:

- one `operator_presence` table or one small in-memory registry plus SQLite
  fallback
- heartbeat every 15-30 seconds from the admin shell when the founder is active
- mark operator offline after a short TTL
- expose a small read endpoint for the public chat surface

User-facing states can be simple:

- founder online
- founder recently active
- founder offline

That is enough for the product shape you described.

### 3. Add explicit handoff states

The system should have a first-class conversation handoff state model:

- AI active
- AI active, operator watching
- human active
- queued for human follow-up

This is better than overloading one admin toggle. It also creates a clearer basis
for status chips, queue ordering, and notification behavior.

### 4. Make deferred job status conversational, not infrastructural

The job system is strong, but the copy should feel less like queue internals and
more like workflow progress. For example:

- "Drafting the first version"
- "Checking the structure"
- "Preparing final review"

This matters for perceived speed because users tolerate longer work when the
progress language is human and specific.

## Phase 3: Aggressive But Still Rational Changes

These are the changes to consider after Phase 1 and Phase 2 are measured.

### 1. Replace polling-style job SSE with in-process fanout

Keep the database as the durable source of truth, but stop making every browser
connection poll the repository every `500ms`.

Better single-node model:

- worker appends durable job event to SQLite
- worker also publishes the event to an in-process broadcaster
- SSE subscribers receive immediate push
- reconnect path still rehydrates from durable event history

That preserves correctness while making the UI feel much more alive.

### 2. Add a tool scheduler instead of a naive executor

The current registry plus middleware design is good, but execution policy is
still basic. Add a scheduler that understands:

- read-only vs mutating
- cheap vs expensive
- parallel-safe vs serial-only
- inline vs deferred
- timeout budgets per tool family

This will do more for Ordo than rewriting the registry in another language.

### 3. Introduce query-result caching for hybrid search

The hybrid search engine currently pulls embeddings and scores in process. That is
fine for moderate corpus size, but repeated search queries should not keep paying
the full cost.

Add:

- query embedding cache
- hybrid result cache by normalized query and role
- corpus-version invalidation

Only after that should you consider deeper search infrastructure changes.

### 4. Improve the search backend before rewriting the app runtime

If search becomes a real hotspot, the likely next move is not Rust-first. It is:

1. optimize the vector path and caches
2. move to a better storage/runtime for search if needed
3. migrate the primary relational store to PostgreSQL when the single-node shape
   stops being enough

If a Rust component ever makes sense, it is more likely to be a focused search or
heavy-transform sidecar than a full replacement of the chat app.

### 5. Add background precomputation where the user repeatedly asks similar things

Examples:

- top corpus summaries by topic
- common section bundles
- popular comparison prompts
- operator dashboard snapshots

For a small product, these can be simple periodic jobs rather than a large event
pipeline.

## What I Would Not Do Yet

### 1. I would not do a full Rust rewrite now

Nothing in the current code suggests that JavaScript/TypeScript is the primary
bottleneck. The stronger evidence points to:

- serial orchestration
- too much inline work
- polling-based realtime delivery
- missing cache layers on repeated expensive reads
- product-state gaps around takeover and presence

Fix those first.

### 2. I would not overbuild a distributed architecture for current usage

The repo is already explicit that SQLite implies a single-node invariant.

Relevant source:

- `docs/operations/single-node-invariant.md`

That is acceptable for a solopreneur product. The right optimization strategy is
to get the single node extremely good before introducing distributed complexity.

### 3. I would not hide latency behind fake streaming

If the system is waiting on a slow tool or a deferred job, say so truthfully.
The answer is not fake token drizzle. The answer is explicit status language and
faster orchestration.

## Concrete Roadmap

## Week 1

- add chat-turn latency instrumentation
- log per-tool timings and tool-round counts
- measure queue wait and job duration
- enforce conversation-mode check in `/api/chat/stream`
- add basic founder presence endpoint and TTL heartbeat

## Week 2

- classify tools into inline vs deferred more aggressively
- lower job pickup latency
- add immediate UI states for thinking, running tools, and queued work
- add first narrow caches for repeated search and pure tool reads

## Week 3

- add parallel execution for safe read-only tool calls
- add in-process fanout for job events while keeping SQLite as source of truth
- add operator-available and handoff state UI to the main chat experience

## Week 4+

- review metrics again
- if corpus/search remains hot, add deeper retrieval optimization
- if concurrency pressure outgrows the single-node model, prioritize PostgreSQL
  migration before considering a broad runtime rewrite

## Suggested Metrics To Track

Use these as the minimum dashboard:

- median and p95 time to first delta
- median and p95 total chat-turn duration
- average tool rounds per request
- average per-tool latency by tool name
- percentage of turns that call at least one tool
- percentage of turns that should have been deferred but were inline
- median queue wait time
- median job execution time
- active SSE connection count
- chat stream error rate
- SQLite busy errors
- search latency by query type
- takeover events per day
- founder online minutes per day

## Bottom Line

Studio Ordo is close to the point where product responsiveness matters more than
raw backend power. The right move is not to ask, "Should this be Rust?" The right
move is to ask, "Why is the user waiting right now, and should that wait even be
on the synchronous path?"

My assessment is:

- keep Next.js, TypeScript, and the current app architecture for now
- optimize orchestration first
- use deferred jobs much more intentionally
- add presence and hard runtime takeover
- improve the event delivery model
- move to PostgreSQL before considering any broad rewrite

If those changes are made well, Ordo should feel substantially faster and more
trustworthy without abandoning the current stack.
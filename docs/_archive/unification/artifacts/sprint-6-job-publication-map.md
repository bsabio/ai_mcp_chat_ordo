# Sprint 6 Artifact — Job Publication Map

> Maps every job-state publication channel to its function chain and
> the shared `buildJobPublication()` contract.

## Before Sprint 6

Each channel independently orchestrated synthetic-event fallback and
audit-event filtering before calling the shared projection chain:

```
Channel 1 (Main-stream)     → jobStatusSnapshotToStreamEvent(snapshot)
Channel 2 (Chat events SSE) → projectJobForEvent() → buildJobStatusPartFromProjection() → jobStatusPartToStreamEvent()
Channel 3 (Job events SSE)  → projectJobForEvent() → buildJobStatusPartFromProjection() → jobStatusPartToStreamEvent()
Channel 4 (Per-job SSE)     → same as Channel 3
Channel 5 (Conv. projector) → buildJobStatusPart()
```

Audit-only event handling and synthetic-event fallback were duplicated
in Channels 2-4 (`mapJobEventPayload`) and Channel 5
(`buildJobStatusSnapshot`), with slightly different logic.

## After Sprint 6

All channels converge through one entry-point:

```
                    buildJobPublication(job, event?, renderableEvent?)
                              │
                    ┌─────────┴──────────┐
                    │  resolvePublicationEvent()  │
                    │  (audit filter + synthetic  │
                    │   fallback — ONE place)     │
                    └─────────┬──────────┘
                              │
                    projectJobForEvent()
                              │
                    buildJobStatusPartFromProjection()
                              │
                    ┌─────────┴──────────┐
                    │   JobPublication    │
                    │   { part, event }   │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    publicationTo       part directly     jobStatusSnapshot
    StreamEvent()       (projector)       ToStreamEvent()
              │                               │
         SSE channels              Main-stream promotion
```

## Channel → Function Chain Mapping

| Channel | Entry Point | Delegates To | Output |
| --- | --- | --- | --- |
| Main-stream promotion | `jobStatusSnapshotToStreamEvent()` | `buildJobStatusSnapshot()` → `buildJobPublication()` | `StreamEvent` |
| Chat events SSE | `mapJobEventPayload()` | `buildJobPublication()` → `publicationToStreamEvent()` | `Record<string, unknown>` |
| Job events SSE | `mapJobEventPayload()` | `buildJobPublication()` → `publicationToStreamEvent()` | `Record<string, unknown>` |
| Per-job events SSE | `mapJobEventPayload()` | `buildJobPublication()` → `publicationToStreamEvent()` | `Record<string, unknown>` |
| Conversation projector | `project()` | `buildJobPublication()` → `.part` | `JobStatusMessagePart` |

## Key Invariant

All 5 channels produce identical `JobStatusMessagePart` shapes for the
same `(job, event)` input — verified by the channel equivalence test in
`job-publication.test.ts`.

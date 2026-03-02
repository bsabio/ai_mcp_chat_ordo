# Chapter 8 - Observability, Feedback, and Evals

## Abstract
Without feedback loops, orchestration quality decays silently. This chapter defines how to instrument behavior and convert runtime signals into iterative improvements.

## Why Observability Is a Design Primitive
In AI-native systems, the failure mode is often subtle degradation, not only hard crashes. Responses may become slower, less consistent, or more error-prone long before an outage is visible. Observability is therefore not just an SRE concern; it is an architecture concern.

If orchestration is your control surface, observability is your steering feedback.

## The Signal Stack
Useful observability for orchestration-driven systems usually needs four signal classes:

1. **Correctness signals**: validation errors, tool-call failures, schema mismatches.
2. **Latency signals**: request duration, provider call duration, timeout incidence.
3. **Resilience signals**: retries, fallback path usage, non-transient failure rates.
4. **Governance signals**: config failures, startup guardrail triggers, release verification results.

Each class should map to structured events rather than ad hoc logs.

## Repository Example: Structured and Extensible Signals
This repository demonstrates the stack in concrete form:

- Route responses include `requestId` and `errorCode` for client-visible correlation.
- Observability emission flows through a typed publisher/listener model in `src/lib/observability/events.ts`.
- Route metrics emit as structured events via `src/lib/observability/metrics.ts`.
- Shared route orchestration in `src/lib/chat/http-facade.ts` centralizes lifecycle signal emission.

This design keeps route logic focused while maintaining consistent signal behavior.

## Practical Lens
Design observability to support both incident response and orchestration quality evolution.

## Evals as Operational Feedback
Evaluation loops should be tied to real runtime characteristics, not only synthetic benchmarks. A practical pattern:

1. Capture structured runtime events.
2. Define threshold-based alerts for regression classes.
3. Feed recurring regressions into sprint planning.
4. Validate fixes with the same observability signals that exposed the issue.

That closes the loop between observation and design improvement.

## Repository Example
- Request correlation and error taxonomy are embedded in route envelopes via `requestId` and `errorCode` fields.
- Observability now uses a publisher/listener model (`src/lib/observability/events.ts`) to keep signal emission extensible.
- Route metrics are emitted as structured events and can be shipped externally without in-process aggregation coupling.

## Anti-Patterns
- Logging without structure (hard to aggregate, harder to query).
- Signals without ownership (nobody responds to regressions).
- Metrics without action thresholds (vanity instrumentation).
- Separate eval workflows disconnected from production behavior.

## Exercise
Select one orchestration workflow and define:

- 3 correctness metrics,
- 2 latency metrics,
- 2 resilience metrics,
- 1 governance metric.

Then document who owns each metric and what action triggers when thresholds are violated.

## Chapter Checklist
- Are observability signals structured and queryable?
- Is correlation available across request boundaries?
- Do eval loops feed directly into execution planning?
- Can new signal sinks be added without route rewrites?

If yes, observability is functioning as a true engineering feedback system.

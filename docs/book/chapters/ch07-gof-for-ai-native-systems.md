# Chapter 7 - GoF Patterns for AI-Native Systems

## Abstract
Classical patterns still matter in LLM systems, especially where orchestration complexity grows. This chapter shows how GoF patterns increase composability and reduce route-level fragility.

## Why GoF Still Works Here
AI-native systems can feel novel, but they still fail for familiar reasons: duplication, implicit coupling, unclear boundaries, and mixed concerns in route handlers. GoF patterns remain useful because they manage structure under change.

In orchestration-heavy systems, change is constant. Prompts evolve, providers evolve, and operational requirements evolve. The engineering question is not whether change happens; it is whether the codebase remains legible and safe while change happens.

## Pattern Set Applied in This Repository

### Observer
Observability emission moved into a typed event bus so producers and sinks are decoupled. This enables adding sinks without rewriting route logic.

### Decorator
Provider calls are wrapped with composable cross-cutting behavior (timing, error shaping), reducing duplication and keeping core provider responsibility narrow.

### Chain of Responsibility
Provider error handling now flows through explicit handlers (model-not-found, transient retry, default throw), replacing brittle branching sprawl.

### Template Method + Facade
Route lifecycle flow was centralized into a reusable algorithm and helper facade, reducing route duplication and standardizing response/error telemetry behavior.

These patterns are not decorative. They reduce correction load and improve predictability.

## Practical Lens
Use patterns only when they reduce accidental complexity and sharpen module boundaries.

## Repository Example
Pattern upgrades in this repository map directly to concrete modules:

- Observer event bus: `src/lib/observability/events.ts`
- Decorator wrappers: `src/lib/chat/provider-decorators.ts`
- Chain logic: `src/lib/chat/anthropic-client.ts`
- Template + facade route orchestration: `src/lib/chat/http-facade.ts`

Route files became thinner and more consistent after template/facade adoption, while provider resilience logic became easier to reason about after the handler chain was made explicit.

## Tradeoffs and Guardrails
- **Do not pattern-stack blindly.** Every pattern adds abstraction cost.
- **Prefer explicitness over cleverness.** If a new engineer cannot trace control flow quickly, the pattern application is too dense.
- **Keep tests close to behavior seams.** Pattern seams are ideal test boundaries.

The target is not “more patterns.” The target is cleaner change surfaces.

## Exercise
Choose one route-level concern currently duplicated in your codebase and refactor it through either:

1. Template Method + Facade, or
2. Decorator + Chain of Responsibility.

Then measure:

- number of duplicated branches removed,
- number of files touched for the next related change,
- regression pass stability after refactor.

## Chapter Checklist
- Are claimed patterns visible as explicit structures in code?
- Did pattern adoption reduce duplication and clarify boundaries?
- Are pattern outcomes validated by regression gates?

When those checks pass, GoF is not legacy theory; it is operational leverage for modern systems.

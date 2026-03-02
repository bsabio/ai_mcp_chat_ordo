# Chapter 6 - 12-Factor in the LLM Era

## Abstract
12-Factor remains a strong backbone for modern systems, including AI-backed apps. This chapter translates each factor into concrete practices for LLM routes, provider integrations, and operational scripts.

## Why 12-Factor Still Matters
LLM-enabled apps are still apps. They still fail in predictable ways: configuration drift, release inconsistency, weak observability, fragile shutdown behavior, and unclear operational ownership.

12-Factor remains relevant because it defines operationally durable defaults. In AI-backed systems, these defaults become more important, not less.

## Factor Reinterpretation for LLM Systems

### Config (III)
External model keys and model identifiers increase secret and drift risk. Config must be centralized, validated, and environment-specific.

### Backing Services (IV)
LLM providers are attached resources that can fail, timeout, or change behavior. Provider abstraction and resilience strategy are essential.

### Build/Release/Run (V)
When model behavior and runtime settings interact, reproducibility depends on strict stage separation and release metadata.

### Disposability (IX)
Streaming routes make shutdown semantics critical; graceful drain behavior is no longer optional for production reliability.

### Logs and Admin Processes (XI/XII)
Operational trust requires structured events, correlation IDs, and executable one-off commands.

## Repository Example: Practical Compliance Moves
This repository implemented concrete 12-factor controls:

- Config centralization and validation in `src/lib/config/env.ts`.
- Build/release/run scripting in `package.json` and release-manifest scripts.
- Health contracts through `/api/health/live` and `/api/health/ready`.
- Graceful process lifecycle through `scripts/start-server.mjs`.
- Observability and error taxonomy through route envelopes and structured events.
- Admin one-off commands in `scripts/admin-*.ts`.
- Environment parity profile via templates and container artifacts.

The important pattern is not any single file. It is the conversion of each factor into executable checks and repeatable commands.

## Practical Lens
Treat 12-factor as a checklist of testable architecture properties, not a documentation style.

## Validation Strategy
For each factor, require three proofs:

1. **Implementation proof**: a concrete module/script/route.
2. **Command proof**: a repeatable command demonstrating behavior.
3. **Artifact proof**: a document or audit record preserving outcome.

Without all three, compliance is incomplete.

## Repository Example
- Config hardening and compatibility handling were centralized in `src/lib/config/env.ts`.
- Build-release-run separation and release metadata are encoded in `package.json` + `scripts/generate-release-manifest.mjs`.
- Health/readiness and admin process scripts are implemented as executable operations, not just documentation.
- Parity profile is backed by `Dockerfile`, `compose.yaml`, and env template parity checks.

## Exercise
Run a 12-factor mini-audit on one service in your organization:

1. Score each factor pass/partial/fail.
2. For each partial/fail, create one sprint with acceptance checks.
3. Execute two sprints and publish a QA artifact with objective results.

This exercise usually reveals whether your team treats operations as engineering or as policy.

## Chapter Checklist
- Is each factor mapped to concrete implementation and validation evidence?
- Are operational claims reproducible by command?
- Is compliance framed as a living state, not a one-time declaration?

12-factor in the LLM era is not nostalgia. It is operational survival with better tools.

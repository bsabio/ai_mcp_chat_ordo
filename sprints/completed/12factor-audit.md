# 12-Factor App Audit

Date: 2026-03-02
Project: Next.js chat + MCP calculator

## Executive Summary
The app is functionally solid and test-backed, but currently aligns best as **partially compliant** with 12-factor methodology. Strong areas include explicit dependencies and config extraction. Biggest gaps are release separation, observability, admin process formalization, and runtime process lifecycle controls.

## Factor-by-Factor Findings

### I. Codebase — **Pass**
- Single repository with one deployable app and structured sources.
- Clear module boundaries under `src/lib` and `src/app`.

### II. Dependencies — **Pass**
- Explicit `package.json` and lockfile.
- Reproducible installs with npm.

### III. Config — **Partial**
- Good: centralized env getters (`src/lib/config/env.ts`) and `.env.example` template.
- Gap: local `.env` still exists and may be manually populated; no startup guard/doc for required variables and secret scanners.

### IV. Backing Services — **Partial**
- Good: Anthropic and MCP are treated as attached services.
- Gap: no provider abstraction contract for easy swap/failover and no resilience policies (timeouts/retries/circuit strategy) captured.

### V. Build, Release, Run — **Fail/Partial**
- Good: clear build and start scripts.
- Gap: no explicit release artifact/versioning strategy, migration step registry, or deployment promotion workflow.

### VI. Processes — **Partial**
- App is mostly stateless in process memory.
- Gap: no formal process manager/container contract and no explicit guarantee for horizontal stateless behavior documentation.

### VII. Port Binding — **Partial**
- Next.js runtime provides port binding.
- Gap: no health/readiness endpoints and no documented platform contract (port, probes, graceful shutdown behavior).

### VIII. Concurrency — **Partial**
- Scale-out is possible with web process replication.
- Gap: process types are not declared (web/worker/admin) and no queue/worker model documented if future tasks grow.

### IX. Disposability — **Partial**
- Quick startup is likely acceptable.
- Gap: no graceful termination handling tests; streaming connections may not have explicit shutdown semantics documented.

### X. Dev/Prod Parity — **Partial**
- Good: same language/runtime family in dev and prod.
- Gap: no containerized parity profile or reproducible local-prod topology with explicit environment matrix.

### XI. Logs — **Fail/Partial**
- Some error responses exist, but no structured logs.
- Gap: no correlation IDs, request-scoped logging, log event schema, or centralized forwarding guidance.

### XII. Admin Processes — **Partial**
- MCP calculator command exists.
- Gap: no formal one-off admin task framework (scripts, seeding, diagnostics, key rotation check, smoke tasks).

## Priority Risk Areas
1. Build-release-run separation and release controls.
2. Logging/observability baseline.
3. Health/readiness + disposability.
4. Config hardening and secret hygiene automation.

## Target State
After planned sprints, the app should be deployment-safe, observability-ready, and operationally repeatable under 12-factor conventions.

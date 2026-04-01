# Sprint 1 — Gateway Scaffold And Health

> **Goal:** Stand up the gateway as a local upstream process with health and warmup surfaces, without integrating any real model adapters yet.
> **Spec ref:** §3.3
> **Prerequisite:** Sprint 0 complete.

---

## Sprint Scope

1. Create the standalone gateway package or workspace and its process entrypoint.
2. Add health, system, and warmup endpoints for local operational visibility.
3. Add OS-aware daemon lifecycle management for Apple mode.

## Out Of Scope

1. No real Apple or Ollama model execution yet.
2. No `ordoSite` request routing through the gateway yet.
3. No browser-contract changes of any kind.

---

## Task 1.1 — Create The Gateway Package Or Workspace

**What:** Add a standalone Node package or sibling workspace for the local gateway runtime.

| Item | Detail |
| --- | --- |
| **Create** | gateway package structure outside the existing Next app runtime |
| **Create** | gateway `package.json`, TypeScript config, and process entrypoint |
| **Spec** | §3.3 |
| **Reqs** | `ULG-045` |

The exact folder can be `gateway/` inside this repo for the first iteration. The key requirement is process separation from the Next app. `[ULG-S1-001]`

---

## Task 1.2 — Expose Health And Warmup Endpoints

**What:** Add the minimum operational HTTP surface.

| Item | Detail |
| --- | --- |
| **Create** | `GET /health` |
| **Create** | `GET /v1/models/system` |
| **Create** | `POST /v1/warmup` |
| **Spec** | §3.3 |
| **Reqs** | `ULG-045`, `ULG-055` |

These endpoints should report:

1. process liveness
2. active adapter availability
3. platform compatibility for Apple-backed adapters
4. warmup support status

---

## Task 1.3 — Add Daemon Lifecycle Management For Apple Mode

**What:** Add an OS-aware daemon manager for Apple-backed local execution.

| Item | Detail |
| --- | --- |
| **Create** | daemon lifecycle manager in the gateway package |
| **Create** | tests for Darwin and non-Darwin behavior |
| **Spec** | §3.4, §4 |
| **Reqs** | `ULG-049`, `ULG-061` |

Rules:

1. Apple-backed adapters must disable cleanly off macOS.
2. Socket or daemon targets must stay server-owned configuration.
3. Startup should report readiness state clearly instead of silently failing.

---

## Validation

1. Gateway package tests prove the process can boot independently from the Next.js runtime.
2. Endpoint tests cover `/health`, `/v1/models/system`, and `/v1/warmup` success and failure states.
3. Daemon lifecycle tests cover Darwin and non-Darwin startup behavior plus fail-closed reporting.

---

## Sprint 1 — Completion Checklist

- [ ] Gateway process starts independently from the Next app.
- [ ] Health, system, and warmup endpoints exist and are tested.
- [ ] Apple daemon lifecycle is OS-aware and fail-closed.

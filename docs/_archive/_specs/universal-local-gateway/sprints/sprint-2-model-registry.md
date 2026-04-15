# Sprint 2 — Local Registry And Adapters

> **Goal:** Add logical alias routing and the first local backend adapters behind a single gateway registry.
> **Spec ref:** §3.4, §3.6
> **Prerequisite:** Sprint 1 complete.

---

## Sprint Scope

1. Define the gateway-local engine port used by all local providers.
2. Add the alias registry that resolves logical model names to concrete adapters.
3. Implement the first Apple-backed and Ollama-backed adapter seams with bounded local execution policy.

## Out Of Scope

1. No browser-side SSE changes.
2. No broad migration of unrelated Anthropic consumers.
3. No semantic cache, MLX exploration, or speculative routing work in this sprint.

---

## Task 2.1 — Define The Gateway Model Engine Port

**What:** Create the provider port used only inside the gateway package.

| Item | Detail |
| --- | --- |
| **Create** | gateway-local `LocalModelEngine` interface |
| **Spec** | §3.4 |
| **Reqs** | `ULG-047`, `ULG-053` |

The port should support at least:

1. message generation
2. streaming generation
3. warmup
4. adapter-specific readiness metadata

---

## Task 2.2 — Implement The Gateway Alias Registry

**What:** Add a registry that maps logical aliases such as `local-fast` and `local-pro` to adapter-backed model definitions.

| Item | Detail |
| --- | --- |
| **Create** | gateway-local model registry |
| **Create** | registry tests |
| **Spec** | §3.4 |
| **Reqs** | `ULG-047`, `ULG-048` |

Rules:

1. Unsupported aliases fail clearly.
2. Apple-backed aliases cannot resolve on unsupported platforms.
3. Registry config is server-owned and must not be caller-controlled.

---

## Task 2.3 — Add Apple And Ollama Adapter Seams

**What:** Implement the first real local backends.

| Item | Detail |
| --- | --- |
| **Create** | Apple-backed adapter via `ordo` daemon transport |
| **Create** | Ollama-backed adapter via HTTP |
| **Create** | concurrency and timeout tests for local-only backends |
| **Spec** | §3.4, §3.6 |
| **Reqs** | `ULG-049`, `ULG-053`, `ULG-055` |

Notes:

1. MLX remains optional future work until there is a concrete runtime choice.
2. Local-only concurrency gates should live in the gateway, not in `ordoSite`.

---

## Validation

1. Registry tests cover supported aliases, unsupported aliases, and off-platform Apple disablement.
2. Adapter tests cover readiness reporting, timeout behavior, and provider-owned configuration only.
3. Concurrency tests prove local-only throttling is enforced in the gateway rather than the app.

---

## Sprint 2 — Completion Checklist

- [ ] Logical aliases resolve to real local adapters.
- [ ] Apple and Ollama adapters report readiness cleanly.
- [ ] Local-only concurrency protection is covered by tests.

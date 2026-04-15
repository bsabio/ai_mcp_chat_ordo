# 06 Test And Verification Strategy
> **Historical snapshot.** This document describes the pre-unification system
> state and was used as research input for the sprint program. For current
> architecture, see `02-post-unification-architecture.md` and
> `04-fully-unified-architecture.md`.
This document describes how to increase confidence at the architecture seams.

## 1. Current Risk Pattern

The repo has many tests, but the highest-value seams are often the most mocked.

This creates a false sense of safety during refactors.

## 2. Testing Goals For Unification

The test strategy should prove:

1. capability derivation is correct
2. provider runtime behavior is consistent across flows
3. prompt mutation paths are behaviorally equivalent
4. MCP exports match internal capability definitions
5. deferred job payloads remain renderable and durable

## 3. Test Layers To Add Or Strengthen

### Capability catalog derivation tests

Given a capability definition, verify generated outputs for:

- internal tool descriptor
- Anthropic schema
- presentation descriptor
- deferred-job metadata
- MCP tool definition

### Real route integration tests

Use temp DB and real tool composition where practical.

Mock only external providers, not the internal tool registry and queue seams by default.

### Prompt mutation equivalence tests

Verify that:

- admin UI prompt actions
- MCP prompt actions
- script paths if added

all produce the same prompt-version and conversation-event behavior.

### MCP server protocol tests

Spawn the real stdio servers and verify:

- tool listing
- input validation
- tool execution output shape
- parity with internal domain services where intended

### Provider runtime contract tests

Verify once in the shared provider runtime:

- timeout behavior
- retry behavior
- fallback behavior
- mapped error shape

Then avoid duplicating those tests across every consumer.

## 4. Test Matrix

| Concern | Unit | Integration | Protocol | Runtime |
| --- | --- | --- | --- | --- |
| Capability derivation | yes | yes | yes | no |
| Prompt runtime | yes | yes | no | yes |
| Provider runtime | yes | yes | no | yes |
| Deferred jobs | yes | yes | no | yes |
| MCP exports | yes | yes | yes | optional |

## 5. Reduce Mock Surface At High-Value Seams

### Prefer mocking

- external network providers
- file system where not under test
- clock or UUID generation where determinism is needed

### Avoid mocking by default

- internal tool registry
- prompt runtime
- result envelope projection
- queue event promotion logic
- capability presentation derivation

## 6. Verification Beyond Tests

The repo already has strong operational verification habits. The unification work should extend that discipline.

### Add or strengthen

- architecture drift checks generated from the capability catalog
- prompt provenance inspection tooling
- provider runtime diagnostics
- MCP server smoke commands in CI or release verification

## 7. Example High-Value Regression Cases

These are the kinds of regressions the new strategy should catch early:

- a capability exported to MCP but not visible to the app registry
- a prompt mutation path that skips domain event emission
- a deferred tool whose UI descriptor no longer matches execution mode
- a provider fallback policy that works in direct turns but not in streaming
- a stale route test that passes despite an interface mismatch because the wrong seam is mocked

## 8. Success Criteria

The verification strategy is strong enough when architecture refactors can be made against shared contracts with low fear and low guesswork.
# Sprint 3 Remaining Blind Spots

Sprint 3 closes the main prompt-runtime seam gap, but it does not eliminate every external or cross-system risk.

## Still Outside Coverage

1. Real Anthropic SDK streaming, retry, timeout, and transport-failure behavior is still doubled.
2. Prompt-slot DB reads on the happy path are not exercised by the reduced-mock route or pipeline seam tests; Sprint 3 forces fallback slot resolution to keep the prompt-runtime seam deterministic.
3. Full tool-composition-root wiring is still broader than the new route seam harness. Sprint 3 uses a real registry plus governed inspection, but not the full production tool bundle graph.
4. Deferred-job queue composition, repository-factory behavior, and real renderable job-event persistence are not part of the new reduced-mock seam tests.
5. Non-chat prompt producers remain out of scope. Direct-turn and live-eval are covered, but summarization and other prompt surfaces are unchanged.

## Acceptable After Sprint 3

These remaining gaps are acceptable because Sprint 3 was explicitly scoped to remove route-wide prompt blindness before Sprint 4 provider-policy work.

The new tests now prove:

1. prompt runtime is real at the route and pipeline seam
2. governed runtime inspection can expose final prompt provenance across stream, direct-turn, and live-eval surfaces
3. provider-boundary doubles no longer replace route, prompt, or inspection behavior wholesale

## Expected Sprint 4 Focus

Sprint 4 can now work against these narrower remaining risks instead of rebuilding the basic seam harness:

1. provider-policy changes against preserved request shape
2. broader tool-bundle composition checks where policy drift is plausible
3. any additional external-boundary transport tests deemed worth the cost

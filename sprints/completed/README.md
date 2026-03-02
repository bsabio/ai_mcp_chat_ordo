# TDD Sprint Roadmap

This roadmap addresses all audit findings: secret handling, duplication, SRP violations, brittle streaming parser, weak type boundaries, and UI/transport coupling.

## Sprint Order
1. `sprint-00-testing-foundation.md`
2. `sprint-01-secret-safety.md`
3. `sprint-02-shared-chat-policy.md`
4. `sprint-03-calculator-single-source.md`
5. `sprint-04-chat-route-srp-refactor.md`
6. `sprint-05-streaming-hardening.md`
7. `sprint-06-ui-hook-separation.md`
8. `sprint-07-type-safety-and-regression.md`

## Definition of Done (global)
- New behavior is specified by tests first (red-green-refactor).
- `npm run lint` and `npm run build` pass.
- New tests pass locally.
- No API keys are committed; security controls are documented.

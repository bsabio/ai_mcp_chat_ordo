# Sprint 01 - Secret Safety and Key Hygiene

## Goal
Remove active secret risk and enforce safe configuration patterns.

## Problems Addressed
- Keys present in local `.env` and previously shared in plaintext.
- Inconsistent env naming patterns.

## TDD Cycle
### Red
- Add failing tests for env-resolution utility:
  - Reads `ANTHROPIC_API_KEY` first, then `API__ANTHROPIC_API_KEY`.
  - Throws deterministic error when neither exists.
  - Rejects blank/whitespace values.

### Green
- Implement `src/lib/config/env.ts` with validated getters.
- Update API routes to use validated getters only.

### Refactor
- Remove duplicated env lookups from each route.
- Centralize model default/fallback config.

## Deliverables
- `env.ts` config module.
- Security section update in docs for key rotation and local setup.
- `.env.example` is the only tracked env artifact.

## Acceptance Criteria
- No hardcoded keys anywhere in repo.
- Tests verify missing-key behavior and fallback order.
- Manual run returns clear `500` message when key missing.

## Risks
- Breaking local startup; mitigate with explicit startup error messages.

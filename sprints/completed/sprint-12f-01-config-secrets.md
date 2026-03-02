# Sprint 12F-01 - Config and Secret Hardening

## Objective
Achieve strong compliance for Factor III (Config).

## Scope
- Enforce required env vars at startup via typed schema validation.
- Add secret scanning guardrails in CI/local pre-commit.
- Standardize on primary key names; deprecate legacy aliases with warnings.

## TDD Plan
### Red
- Tests fail when required env vars are missing/blank.
- Tests verify deprecation warnings for legacy keys.

### Green
- Implement `env` schema module with explicit errors.
- Add automated secret scan step.

### Refactor
- Remove duplicated env fallback code paths where possible.

## Acceptance Criteria
- App fails fast with clear config errors.
- Secret scan runs in CI and blocks leaked key patterns.
- `.env.example` is authoritative and documented.

# Sprint 12F-03 - Build, Release, Run Separation

## Objective
Close gaps for Factor V.

## Scope
- Define immutable build artifact process.
- Add release metadata/version stamp.
- Separate release-time config injection from build stage.

## TDD Plan
### Red
- Failing tests/checks for missing release metadata.

### Green
- Implement release manifest generation and startup validation.

### Refactor
- Simplify scripts into distinct build/release/run commands.

## Acceptance Criteria
- Distinct commands for build, release packaging, and run.
- Release artifact includes git SHA/version metadata.
- Deployment docs define promotion flow across environments.

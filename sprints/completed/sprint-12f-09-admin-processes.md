# Sprint 12F-09 - One-off Admin Processes and Runbooks

## Objective
Improve Factor XII compliance.

## Scope
- Add explicit admin scripts (diagnostics, health sweep, env validation).
- Provide runbook for one-off operations and incident recovery.
- Ensure admin tasks run in same codebase/runtime as app.

## TDD Plan
### Red
- Tests for admin command outputs and failure behavior.

### Green
- Implement scripts under `scripts/` and wire npm commands.

### Refactor
- Reuse app validation/logging modules in admin commands.

## Acceptance Criteria
- Admin tasks are discoverable from `package.json` scripts.
- Runbook includes when/how to run each task safely.
- Commands are non-interactive and CI-friendly where possible.

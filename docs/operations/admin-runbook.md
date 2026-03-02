# Admin Processes Runbook

All one-off admin commands run in the same codebase/runtime as the app via `tsx`.

## Commands

- `npm run admin:validate-env`
  - Validates required runtime configuration.
  - Exits with status `1` on failure.

- `npm run admin:health`
  - Runs liveness/readiness sweep and emits JSON output.
  - Exits with status `1` if readiness fails.

- `npm run admin:diagnostics`
  - Emits a diagnostics JSON snapshot (app/runtime/version/model/release-manifest presence/metrics).

## Incident Usage

1. Run `npm run admin:validate-env` to detect config drift.
2. Run `npm run admin:health` to verify readiness.
3. Run `npm run admin:diagnostics` and attach output to incident notes.

## CI/Automation

- Commands are non-interactive and shell-friendly.
- Parse outputs as JSON for alerting and diagnostics pipelines.

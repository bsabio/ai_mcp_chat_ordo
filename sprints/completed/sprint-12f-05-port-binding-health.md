# Sprint 12F-05 - Port Binding, Health, and Readiness

## Objective
Bring Factors VII and IX toward compliance.

## Scope
- Add `/api/health/live` and `/api/health/ready` endpoints.
- Validate readiness checks for critical dependencies.
- Document runtime port/probe expectations.

## TDD Plan
### Red
- Tests for healthy/unhealthy responses under dependency failure simulation.

### Green
- Implement liveness/readiness handlers and dependency probes.

### Refactor
- Reuse probe utilities in diagnostics scripts.

## Acceptance Criteria
- Health endpoints return clear JSON status contracts.
- Readiness fails appropriately when required dependencies unavailable.
- Probe behavior documented for deploy platforms.

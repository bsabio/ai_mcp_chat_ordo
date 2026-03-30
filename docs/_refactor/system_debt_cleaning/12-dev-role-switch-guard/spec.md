# Spec 12: Dev Role-Switch Guard Hardening

**Priority:** Medium
**Risk if deferred:** Dev-mode role switching accessible in shared or misconfigured environments; no audit trail
**Files in scope:**
- `src/app/api/auth/switch/route.ts` (~40 lines)

---

## Problem Statement

The role-switch route allows non-admin authenticated users to change their effective role when `NODE_ENV === "development"`. This is acceptable for local development but carries risk:

1. **If `NODE_ENV` is accidentally left as `"development"` in a shared or staging environment**, non-admin users can escalate privileges.
2. **No explicit feature flag** beyond `NODE_ENV`. The guard relies entirely on environment discipline.
3. **No audit logging** — role switches are not recorded anywhere.
4. **No rate limiting** — a user could rapidly cycle through roles.

---

## Architectural Approach

### Step 1: Add a dedicated feature flag

Require an explicit opt-in flag in addition to `NODE_ENV`:

```typescript
// In the route handler
import { getEnvConfig } from "@/lib/config/env-config";

const env = getEnvConfig();
const isDevMode = env.NODE_ENV === "development";
const devSwitchEnabled = env.ENABLE_DEV_ROLE_SWITCH === "true";

if (!isAdmin && !(isDevMode && devSwitchEnabled)) {
  return NextResponse.json(
    { error: "Forbidden — ADMIN role required" },
    { status: 403 },
  );
}
```

This means:
- **Production:** `NODE_ENV=production` → switch requires ADMIN regardless of flag.
- **Development without flag:** `NODE_ENV=development` but `ENABLE_DEV_ROLE_SWITCH` not set → switch requires ADMIN.
- **Development with flag:** `NODE_ENV=development` AND `ENABLE_DEV_ROLE_SWITCH=true` → non-admin users can switch.

### Step 2: Add audit logging

Log every successful role switch with structured data:

```typescript
import { logEvent } from "@/lib/observability/logger";

// After successful role switch:
logEvent({
  level: "warn",
  code: "ROLE_SWITCH",
  message: `User ${user.id} switched role to ${targetRole}`,
  context: {
    userId: user.id,
    previousRole: user.roles,
    targetRole,
    isAdmin,
    isDevMode,
    ip: req.headers.get("x-forwarded-for") ?? "unknown",
  },
  timestamp: new Date().toISOString(),
});
```

Use `level: "warn"` because role switches are security-relevant events that should be visible in log review.

### Step 3: Validate the target role

Ensure the target role is a valid enum member:

```typescript
const VALID_ROLES = new Set(["ADMIN", "STAFF", "APPRENTICE", "USER"]);

const body = await req.json();
const targetRole = body.role;

if (!targetRole || !VALID_ROLES.has(targetRole)) {
  return NextResponse.json(
    { error: `Invalid role. Must be one of: ${[...VALID_ROLES].join(", ")}` },
    { status: 400 },
  );
}
```

### Step 4: Add the flag to local env template

Update `.env.local.example` or equivalent:

```bash
# Enable non-admin role switching in development
# ENABLE_DEV_ROLE_SWITCH=true
```

Leave it commented out by default so new developers must explicitly opt in.

---

## Constraints — Do NOT Introduce

- **Do not** add rate limiting in this spec. Rate limiting is a cross-cutting concern for middleware.
- **Do not** add IP allowlisting. The feature flag is sufficient for this threat model.
- **Do not** change the role switch mechanism (session mutation, cookie update, etc.). Only harden the guard.
- **Do not** require the feature flag for ADMIN users. Admins should always be able to switch roles.
- **Do not** add a database-backed audit log. Structured log output is sufficient (can be shipped to a log aggregator).

---

## Required Tests

### Unit Tests — `tests/dev-role-switch-guard.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `ADMIN user can switch role in production` | `NODE_ENV=production`, user has ADMIN role → 200. |
| 2 | `non-ADMIN user cannot switch role in production` | `NODE_ENV=production`, user has STAFF role → 403. |
| 3 | `non-ADMIN user cannot switch in dev without feature flag` | `NODE_ENV=development`, `ENABLE_DEV_ROLE_SWITCH` not set, user has STAFF role → 403. |
| 4 | `non-ADMIN user can switch in dev with feature flag` | `NODE_ENV=development`, `ENABLE_DEV_ROLE_SWITCH=true`, user has STAFF role → 200. |
| 5 | `target role must be a valid role string` | POST with `{ role: "SUPERADMIN" }` → 400. |
| 6 | `target role is required` | POST with `{}` → 400. |
| 7 | `audit log is emitted on successful switch` | Spy on `logEvent`, perform switch, confirm call with `code: "ROLE_SWITCH"`, correct userId and targetRole. |
| 8 | `audit log is NOT emitted on rejected switch` | Spy on `logEvent`, attempt unauthorized switch, confirm `logEvent` not called with `ROLE_SWITCH`. |
| 9 | `feature flag value must be exactly "true"` | `ENABLE_DEV_ROLE_SWITCH=yes` → treated as false (403 for non-admin). |

### Environment Discipline Test — `tests/dev-role-switch-env.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `ENABLE_DEV_ROLE_SWITCH is not set in any production env file` | Scan `.env.production`, `.env.production.local` (if they exist), confirm the flag is absent or not `"true"`. |

---

## Acceptance Criteria

- [ ] Role switch requires `ADMIN` role in production regardless of any flags.
- [ ] In development, non-admin role switch requires both `NODE_ENV=development` AND `ENABLE_DEV_ROLE_SWITCH=true`.
- [ ] Target role is validated against a known set of roles.
- [ ] Every successful role switch emits a structured audit log event.
- [ ] `.env.local.example` documents the flag (commented out by default).
- [ ] All existing auth tests pass.
- [ ] New tests above pass.

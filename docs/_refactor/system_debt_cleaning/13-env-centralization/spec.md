# Spec 13: Environment Variable Centralization

**Priority:** Medium
**Risk if deferred:** Scattered `process.env` reads make it impossible to know what config is required at startup; missing vars produce cryptic runtime errors
**Files in scope:**
- All `src/` files that read `process.env` directly (~24+ occurrences)
- `src/lib/config/` (existing config/env utilities if any)
- `scripts/validate-env.ts` (existing env validation script)

---

## Problem Statement

Direct `process.env` reads are scattered across at least 24 locations in `src/`. This creates several problems:

1. **No startup validation:** If a required env var is missing, the error surfaces at first use (e.g., first TTS request, first chat stream) rather than at boot.
2. **No single inventory:** There is no authoritative list of required vs optional environment variables.
3. **Inconsistent defaults:** Some reads use `??` fallbacks, some use `||`, some have no fallback.
4. **Type unsafety:** All `process.env` reads are `string | undefined`. Numeric vars (PORT, poll intervals) are parsed ad-hoc.

The existing `scripts/validate-env.ts` validates env at script level but is not used at app startup.

---

## Architectural Approach

### Step 1: Define a typed environment config module

```typescript
// src/lib/config/env-config.ts
import { z } from "zod";

const EnvSchema = z.object({
  // Required
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  
  // Auth / API Keys — required in production
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  
  // Database
  DATA_DIR: z.string().default(".data"),
  
  // Deferred jobs
  DEFERRED_JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  DEFERRED_JOB_WORKER_ID: z.string().optional(),
  
  // Push
  NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  
  // Dev helpers
  ENABLE_DEV_ROLE_SWITCH: z.string().optional(),
  CONFIG_DIR: z.string().optional(),
  
  // CSRF
  ALLOWED_ORIGINS: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let _config: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!_config) {
    const result = EnvSchema.safeParse(process.env);
    if (!result.success) {
      const formatted = result.error.flatten();
      throw new Error(
        `Environment validation failed:\n${JSON.stringify(formatted.fieldErrors, null, 2)}`
      );
    }
    _config = result.data;
  }
  return _config;
}

/** @internal — test-only */
export function _resetEnvConfig(): void {
  _config = null;
}
```

### Step 2: Replace direct `process.env` reads in app code

**Before:**
```typescript
const pollInterval = Number(process.env.DEFERRED_JOB_POLL_INTERVAL_MS) || 5000;
const port = process.env.PORT ?? "3000";
```

**After:**
```typescript
import { getEnvConfig } from "@/lib/config/env-config";
const env = getEnvConfig();
const pollInterval = env.DEFERRED_JOB_POLL_INTERVAL_MS;
const port = env.PORT;
```

### Step 3: Call env validation at startup

In `scripts/start-server.mjs` or the Next.js instrumentation hook:

```typescript
import { getEnvConfig } from "@/lib/config/env-config";

// Fails fast if required env vars are missing
getEnvConfig();
console.log("[startup] Environment validated");
```

### Step 4: Exempt scripts from this requirement

Files under `scripts/` may continue to use `process.env` directly. They run in isolation and often need env vars before the app module system is loaded. However, prefer using `getEnvConfig()` where practical.

### Step 5: Add production-specific required checks

Some vars are optional in development but required in production:

```typescript
// In env-config.ts — add a refinement
const EnvSchema = z.object({ /* ... */ }).refine(
  (env) => {
    if (env.NODE_ENV === "production") {
      if (!env.ANTHROPIC_API_KEY) return false;
    }
    return true;
  },
  { message: "ANTHROPIC_API_KEY is required in production" },
);
```

---

## Constraints — Do NOT Introduce

- **Do not** create a `.env` file generator or interactive setup wizard.
- **Do not** use `process.env` anywhere in `src/app/` or `src/lib/` after this refactor — all reads go through `getEnvConfig()`.
- **Do not** make `getEnvConfig()` async. Environment variables are synchronously available.
- **Do not** centralize `NEXT_PUBLIC_*` variables in this module — they are handled by Next.js's built-in client-side env injection and must remain as `process.env.NEXT_PUBLIC_*` in client code.
- **Do not** add runtime env reloading. Config is read once at startup and cached.
- **Do not** log env var values (especially API keys) during validation - only log field names in error messages.

---

## Required Tests

### Unit Tests — `tests/env-centralization.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `getEnvConfig returns valid config with all defaults` | Set minimal `process.env`, confirm all defaults populated. |
| 2 | `getEnvConfig throws on invalid PORT` | Set `PORT=abc`, expect validation error mentioning PORT. |
| 3 | `getEnvConfig caches result across calls` | Call twice, confirm `===` identity. |
| 4 | `_resetEnvConfig allows re-validation` | Change env vars, reset, call again, confirm new values. |
| 5 | `production requires ANTHROPIC_API_KEY` | Set `NODE_ENV=production` without key, expect error. |
| 6 | `development does not require API keys` | Set `NODE_ENV=development` without keys, expect success. |
| 7 | `DEFERRED_JOB_POLL_INTERVAL_MS is coerced to number` | Set as string `"3000"`, confirm `getEnvConfig().DEFERRED_JOB_POLL_INTERVAL_MS === 3000`. |
| 8 | `unknown env vars are ignored (no strict)` | Set `RANDOM_VAR=test`, confirm no error (Zod strips unknowns). |

### Structural Regression Test — `tests/env-no-direct-reads.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `no direct process.env reads in src/app/ or src/lib/` | Grep for `process\.env\.` in `src/app/` and `src/lib/`. Exclude `NEXT_PUBLIC_*` patterns (those must stay). Confirm zero matches. |
| 2 | `scripts/ may still use process.env directly` | Confirm `scripts/` files are NOT flagged by the above check. |

---

## Acceptance Criteria

- [ ] `getEnvConfig()` is the sole source of environment configuration in `src/app/` and `src/lib/`.
- [ ] All environment variables are defined in a single Zod schema with types and defaults.
- [ ] Validation runs at startup; missing required vars produce a clear error message naming the missing fields.
- [ ] No API keys or secrets are logged during validation.
- [ ] `NEXT_PUBLIC_*` vars remain as direct `process.env` reads in client-only code.
- [ ] `scripts/` are exempt but encouraged to use `getEnvConfig()`.
- [ ] All existing tests pass.
- [ ] New tests above pass.

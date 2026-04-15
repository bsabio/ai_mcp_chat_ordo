# V1 Sprint 0 — Config Layer and Identity

> **Parent spec:** [Platform V1](spec.md) §8 Phase A, Sprint 0
> **Requirement IDs:** PLAT-006, PLAT-010, PLAT-011 (partial)
> **V0 Baseline:** 1194 tests, 175 suites, build clean
> **Goal:** Externalize brand identity, prompt personality, service offerings, and tool activation into JSON config files. Build a typed loader with validation. Replace all hardcoded identity references. Rename the package from `is601_demo` to `studio-ordo`. The system must work identically with **no config files present** (backward compatibility per V1 spec §11.3).

---

## §1 Current State (What We're Replacing)

### §1.1 Hardcoded brand identity — 7 source files, 10+ test files

Brand name, tagline, avatar path, copyright notice, and aria-labels are scattered across the codebase as string literals. A deployer forking the repo for a dental practice would need to find and modify every one.

| File | Hardcoded value(s) | Line(s) |
| --- | --- | --- |
| `src/lib/shell/shell-navigation.ts` | `SHELL_BRAND = { name: "Studio Ordo", shortName: "Ordo", ariaLabel: "Studio Ordo home", markText: "O" }` | 34–40 |
| `src/components/shell/ShellBrand.tsx` | `src="/ordo-avatar.png"` (avatar path) | 71 |
| `src/components/SiteFooter.tsx` | `"Strategic AI advisory, orchestration design..."` tagline, `"© 2026 Studio Ordo. All rights reserved."` copyright | 28–30, 54 |
| `src/app/layout.tsx` | `title: "Studio Ordo | Strategic AI Advisory..."`, `description: "Founder-led strategic AI advisory..."` | 72–75 |
| `src/frameworks/ui/MessageList.tsx` | `"Studio Ordo"`, `"Strategic AI Advisory"` in `HOMEPAGE_SERVICE_CHIPS`; `src="/ordo-avatar.png"` avatar; `"Studio Ordo"` sender name | 24–25, 323, 329 |
| `src/frameworks/ui/FloatingChatLauncher.tsx` | `aria-label="Open Studio Ordo chat"` | 18 |
| `src/frameworks/ui/ChatHeader.tsx` | `src="/ordo-avatar.png"` | 30 |

### §1.2 Hardcoded system prompt identity — 2 source files

The AI's personality is embedded in `buildCorpusBasePrompt()` as a 100+ line string literal that opens with `"You are Studio Ordo, a strategic workflow, implementation, and training advisor..."` and hardcodes tool names, interaction patterns, and brand voice.

| File | What's hardcoded |
| --- | --- |
| `src/lib/corpus-config.ts` | Full prompt in `buildCorpusBasePrompt()`, plus `corpusName`, `corpusDescription`, `documentCount`, `sectionCount` |
| `src/core/use-cases/ChatPolicyInteractor.ts` | `ROLE_DIRECTIVES` per role with hardcoded persona references |

### §1.3 Hardcoded package identity

| File | Value |
| --- | --- |
| `package.json` | `"name": "is601_demo"` |
| `scripts/generate-release-manifest.mjs` | `appName: "is601_demo"` |
| `src/app/dashboard/page.test.tsx` | `appName: "is601_demo"` in test fixture |

### §1.4 Hardcoded infrastructure identity

| File | Value |
| --- | --- |
| `compose.yaml` | `image: kaw393939/studioordo:latest`, `container_name: studioordo` |
| `.github/workflows/ci.yml` | `DOCKER_IMAGE: kaw393939/studioordo` |

### §1.5 V0 extension points already in place

V0 Sprint 1 created the `IdentitySource` port interface (`src/core/ports/IdentitySource.ts`) and `RoleDirectiveSource` port — both designed as config extension points. The `SystemPromptBuilder` already accepts pluggable identity and role directive sources. This sprint implements the config-file-backed adapters those ports were designed for.

---

## §2 Target Architecture

### §2.1 Config file layout

```text
config/
├── identity.json        # brand name, tagline, description, colors, logo path, mark
├── prompts.json         # system prompt personality override, first-message template
├── services.json        # service offerings, pricing tiers, deal structures
└── tools.json           # which MCP tools are active for this instance
```

All four files are **optional**. When any file is missing, the system uses the current hardcoded defaults — identical behavior to today. This ensures zero breakage for existing deployments and a progressive adoption path.

### §2.2 New files

| File | Layer | Purpose |
| --- | --- | --- |
| `config/identity.json` | Config | Studio Ordo flagship defaults (committed as working example) |
| `config/prompts.json` | Config | Default prompts config (committed as working example) |
| `config/services.json` | Config | Service offerings for Studio Ordo flagship |
| `config/tools.json` | Config | Default tool activation (all tools enabled) |
| `src/lib/config/instance.ts` | Lib | Loader: reads config files, validates, caches, exports typed accessors |
| `src/lib/config/instance.schema.ts` | Lib | Runtime validation schemas (hand-written TypeScript validators — no Zod dependency) |
| `src/lib/config/defaults.ts` | Lib | Hardcoded fallback values — extracted from current scattered constants |
| `src/adapters/ConfigIdentitySource.ts` | Adapter | Implements `IdentitySource` port, reads from config layer |
| `src/adapters/ConfigRoleDirectiveSource.ts` | Adapter | Implements `RoleDirectiveSource` port, reads from config layer |
| `tests/config-loader.test.ts` | Test | Config loader unit tests |
| `tests/config-identity.test.ts` | Test | Config-driven identity integration tests |

### §2.3 Modified files

| File | Change |
| --- | --- |
| `package.json` | Rename `name` from `is601_demo` to `studio-ordo` |
| `scripts/generate-release-manifest.mjs` | Read `appName` from config or fallback to `"studio-ordo"` |
| `src/lib/shell/shell-navigation.ts` | `SHELL_BRAND` reads from `getInstanceIdentity()` with current values as fallback |
| `src/components/shell/ShellBrand.tsx` | Avatar path from config instead of hardcoded `"/ordo-avatar.png"` |
| `src/components/SiteFooter.tsx` | Tagline and copyright from config |
| `src/app/layout.tsx` | Metadata `title` and `description` from config |
| `src/frameworks/ui/MessageList.tsx` | Service chips, avatar path, and sender name from config |
| `src/frameworks/ui/FloatingChatLauncher.tsx` | `aria-label` from config |
| `src/frameworks/ui/ChatHeader.tsx` | Avatar path from config |
| `src/lib/corpus-config.ts` | `buildCorpusBasePrompt()` reads personality from `prompts.json` with current prompt as fallback |
| `src/lib/chat/policy.ts` | `createSystemPromptBuilder()` uses `ConfigIdentitySource` → falls back to hardcoded |
| `src/lib/chat/tool-composition-root.ts` | Read `tools.json` to filter tool registration — absent file means all tools enabled |
| `compose.yaml` | Add `./config:/app/config:ro` volume mount |
| `Dockerfile` | `COPY config/ ./config/` (with `COPY --chown` pattern) |

### §2.4 Config schemas

#### `identity.json`

```typescript
interface InstanceIdentity {
  name: string;                    // "Studio Ordo"
  shortName: string;               // "Ordo"
  tagline: string;                 // "Strategic AI Advisory"
  description: string;             // SEO meta description
  domain: string;                  // "studioordo.com"
  logoPath: string;                // "/ordo-avatar.png"
  markText: string;                // "O"
  accentColor?: string;            // oklch color value (optional — CSS default preserved)
  copyright?: string;              // "© 2026 Studio Ordo. All rights reserved."
  serviceChips?: string[];         // ["Studio Ordo", "Strategic AI Advisory", "Orchestration Training"]
}
```

**Validation rules:**
- `name`: non-empty string, max 100 characters
- `shortName`: non-empty string, max 20 characters
- `tagline`: non-empty string, max 200 characters
- `description`: non-empty string, max 500 characters
- `domain`: non-empty string, valid hostname format (no protocol prefix)
- `logoPath`: non-empty string, must start with `/`
- `markText`: non-empty string, max 5 characters
- `accentColor`: optional, if present must be non-empty string
- `copyright`: optional, if present must be non-empty string
- `serviceChips`: optional, if present must be array of 1–8 non-empty strings

#### `prompts.json`

```typescript
interface InstancePrompts {
  personality?: string;            // Appended personality instruction. Optional — falls back to buildCorpusBasePrompt()
  firstMessage?: {
    default?: string;              // Greeting when no referral (V1 Sprint 3 consumes this)
    withReferral?: string;         // Template with {{referrer.name}} (V1 Sprint 3 consumes this)
  };
  defaultSuggestions?: string[];   // Initial suggestion chips (V1 Sprint 3 consumes this)
}
```

**Validation rules:**
- `personality`: optional string, max 5000 characters
- `firstMessage`: optional object; sub-fields optional strings, max 1000 characters each
- `defaultSuggestions`: optional array of 1–6 strings, each max 100 characters

**Note:** `firstMessage` and `defaultSuggestions` are defined in Sprint 0's schema for forward compatibility but are not consumed until V1 Sprint 3 (First Message and Smart Greeting). Sprint 0 validates their shape but does not wire them into the UI.

#### `services.json`

```typescript
interface InstanceServices {
  offerings: Array<{
    id: string;                    // "strategy-sprint"
    name: string;                  // "AI Strategy and Workflow Architecture Sprint"
    description: string;           // What the client gets
    lane: "organization" | "individual" | "both";
    estimatedPrice?: number;       // Base price in cents (optional)
    estimatedHours?: number;       // Typical hours (optional)
  }>;
  bookingEnabled: boolean;         // Default: false (V1 Sprint 8 sets to true)
}
```

**Validation rules:**
- `offerings`: array (can be empty), each element validated:
  - `id`: non-empty string, max 100 characters, alphanumeric + hyphens only
  - `name`: non-empty string, max 200 characters
  - `description`: non-empty string, max 2000 characters
  - `lane`: must be `"organization"`, `"individual"`, or `"both"`
  - `estimatedPrice`: optional, if present must be non-negative integer
  - `estimatedHours`: optional, if present must be positive number
- `bookingEnabled`: boolean (required)

#### `tools.json`

```typescript
interface InstanceTools {
  enabled?: string[];              // Tool IDs to keep active (whitelist). Absent = all enabled.
  disabled?: string[];             // Tool IDs to deactivate (blacklist). Applied after enabled.
}
```

**Validation rules:**
- `enabled`: optional array of non-empty strings
- `disabled`: optional array of non-empty strings
- If both `enabled` and `disabled` are present, `disabled` takes precedence (a tool in both lists is disabled)
- Unknown tool IDs are silently ignored (forward compatibility — a deployer may reference a V1.1 tool)

### §2.5 Config loader design

```typescript
// src/lib/config/instance.ts

/** Read once at import, cached for the process lifetime. */
export function getInstanceIdentity(): InstanceIdentity { ... }
export function getInstancePrompts(): InstancePrompts { ... }
export function getInstanceServices(): InstanceServices { ... }
export function getInstanceTools(): InstanceTools { ... }

/** Uncached accessor for testing — reads fresh from disk. */
export function loadInstanceConfig(): FullInstanceConfig { ... }

/** Validation errors — thrown when a config file is present but invalid. */
export class ConfigValidationError extends Error {
  constructor(public readonly file: string, public readonly violations: string[]) { ... }
}
```

**Loader behavior:**
1. At import, attempt to read each config file from `config/` relative to `process.cwd()` (or `CONFIG_DIR` env var override for Docker mounts).
2. If the file does not exist → use hardcoded defaults. No error. No warning.
3. If the file exists but contains invalid JSON → throw `ConfigValidationError`.
4. If the file exists and parses but fails schema validation → throw `ConfigValidationError` with specific violations.
5. If the file exists and validates → merge with defaults (config values override, missing optional fields use defaults).
6. Cache the result in a module-level variable — one read per process.

**`CONFIG_DIR` env var:** Allows Docker/compose to mount config from an alternative path. Default: `"config"` (relative to cwd). Only consumed server-side.

### §2.6 Adapter integration — how config feeds into V0 ports

```text
config/identity.json
        │
        ▼
┌───────────────────┐
│ getInstanceIdentity() │ ← src/lib/config/instance.ts (loader)
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ ConfigIdentitySource │ ← implements IdentitySource port
└───────┬───────────┘     Reads identity.name + prompts.personality
        │                 Falls back to buildCorpusBasePrompt() when no config
        ▼
┌───────────────────┐
│ SystemPromptBuilder │ ← .withIdentity(configSource)
│   .withIdentity()  │
│   .withRoleDirective()
│   .build()         │
└───────────────────┘
```

The `ConfigIdentitySource` constructs the system prompt identity string by:
1. Reading `identity.name` and `prompts.personality` from config
2. If both are present: interpolates the name into the corpus base prompt template and appends the personality instruction
3. If either is missing: falls back to `buildCorpusBasePrompt()` — zero behavior change

This preserves the current 100+ line prompt exactly when no config is present, while allowing deployers to override the personality and brand name via config files.

---

## §3 Implementation Details

### §3.1 Config validation — hand-written TypeScript validators

No Zod dependency is added. The project has zero runtime validation libraries. Validators are plain functions:

```typescript
// src/lib/config/instance.schema.ts

export function validateIdentity(raw: unknown): InstanceIdentity | string[] {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) return ["identity.json must be a JSON object"];
  const obj = raw as Record<string, unknown>;

  // Validate required string fields
  if (typeof obj.name !== "string" || obj.name.trim() === "")
    errors.push("identity.name: required non-empty string");
  else if (obj.name.length > 100)
    errors.push("identity.name: max 100 characters");
  // ... each field validated similarly

  return errors.length ? errors : obj as unknown as InstanceIdentity;
}
```

Each validator returns either the typed config object or an array of human-readable error strings. The loader collects all errors before throwing, so a deployer sees all problems at once rather than fixing them one at a time.

### §3.2 Shell brand refactor

`SHELL_BRAND` becomes a lazy-initialized constant that reads from config:

```typescript
// src/lib/shell/shell-navigation.ts
import { getInstanceIdentity } from "@/lib/config/instance";

function resolveShellBrand(): ShellBrandMetadata {
  const id = getInstanceIdentity();
  return {
    name: id.name,
    shortName: id.shortName,
    homeHref: "/",
    ariaLabel: `${id.name} home`,
    markText: id.markText,
  };
}

export const SHELL_BRAND: ShellBrandMetadata = resolveShellBrand();
```

### §3.3 MessageList brand refactor

The `HOMEPAGE_SERVICE_CHIPS` array and the assistant avatar/sender name are derived from config:

```typescript
import { getInstanceIdentity } from "@/lib/config/instance";

function getServiceChips(): string[] {
  const id = getInstanceIdentity();
  return id.serviceChips ?? [id.name, id.tagline, "Orchestration Training"];
}
```

### §3.4 Tool filtering

The tool composition root reads `tools.json` to determine which tools to register:

```typescript
// In createToolRegistry():
const toolConfig = getInstanceTools();
// After registering all tools:
if (toolConfig.enabled) {
  // Remove any tool not in the enabled list
}
if (toolConfig.disabled) {
  // Remove any tool in the disabled list
}
```

Absent config = all tools enabled (current behavior). An empty `enabled` array means **no tools** — a valid deployer choice for a content-only instance.

### §3.5 Package rename

`package.json` `name` field changes from `is601_demo` to `studio-ordo`. This also updates:
- `scripts/generate-release-manifest.mjs` — reads from config or defaults to `"studio-ordo"`
- `src/app/dashboard/page.test.tsx` — test fixture updated

### §3.6 Docker integration

```yaml
# compose.yaml — new volume mount
volumes:
  - ./config:/app/config:ro
```

```dockerfile
# Dockerfile — copy config directory
COPY config/ ./config/
```

---

## §4 Migration and Backward Compatibility

### §4.1 Zero-config operation

The system MUST work identically to today when:
- The `config/` directory does not exist
- The `config/` directory exists but is empty
- Individual config files are missing

No warnings, no degraded behavior. The deployer opts in incrementally — they can start with just `identity.json` and add others later.

### §4.2 Existing test preservation

All 1194 existing tests must pass without modification to test assertions. When tests assert brand strings like `"Studio Ordo"`, the config layer returns those exact strings as hardcoded defaults. Tests that mock shell navigation or brand values continue to work because the mock overrides the config-backed constant.

### §4.3 Config file committed to repo

The `config/` directory is committed with Studio Ordo flagship values. This serves as:
1. A working example for deployers to study
2. Documentation of all available config fields
3. The actual configuration for the flagship instance

Deployers fork and modify these files. They do not need to create them from scratch.

---

## §5 Test Specification

### §5.1 Positive tests (expected behavior works)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `loads identity.json and returns typed config` | Read a valid `identity.json` fixture → `getInstanceIdentity()` returns all fields with correct types |
| P2 | `loads prompts.json and returns typed config` | Read a valid `prompts.json` fixture → `getInstancePrompts()` returns fields including nested `firstMessage` |
| P3 | `loads services.json and returns typed offerings` | Read a valid `services.json` with 3 offerings → `getInstanceServices().offerings` has length 3, each with correct `id`, `name`, `lane` |
| P4 | `loads tools.json with enabled list` | `tools.json` with `enabled: ["calculator", "search_corpus"]` → `getInstanceTools().enabled` is `["calculator", "search_corpus"]` |
| P5 | `falls back to hardcoded identity when no config file exists` | No `config/identity.json` on disk → `getInstanceIdentity().name` returns `"Studio Ordo"`, `.shortName` returns `"Ordo"`, `.tagline` returns `"Strategic AI Advisory"` |
| P6 | `falls back to hardcoded prompts when no config file exists` | No `config/prompts.json` → `getInstancePrompts().personality` is `undefined`, system prompt uses `buildCorpusBasePrompt()` output |
| P7 | `falls back to all tools enabled when no tools.json exists` | No `config/tools.json` → `getInstanceTools().enabled` is `undefined` (meaning all tools active) |
| P8 | `ConfigIdentitySource implements IdentitySource port` | Construct `ConfigIdentitySource` → call `.getIdentity()` → returns non-empty string containing the configured brand name |
| P9 | `ConfigRoleDirectiveSource returns directive for each role` | Call `.getDirective("ANONYMOUS")`, `.getDirective("ADMIN")` → each returns non-empty directive string |
| P10 | `SHELL_BRAND reflects config identity` | With config loaded → `SHELL_BRAND.name` matches `identity.name`, `SHELL_BRAND.ariaLabel` matches `"${identity.name} home"` |
| P11 | `layout metadata reads from config` | With identity config → page metadata title includes the configured brand name |
| P12 | `MessageList service chips read from config` | With `identity.serviceChips: ["Acme", "Dental AI"]` → rendered chips match config values, not hardcoded defaults |
| P13 | `FloatingChatLauncher aria-label reads from config` | With `identity.name: "Acme Dental"` → launcher has `aria-label="Open Acme Dental chat"` |
| P14 | `SiteFooter copyright reads from config` | With `identity.copyright: "© 2026 Acme."` → footer renders that string, not the Studio Ordo default |
| P15 | `SiteFooter tagline reads from config` | With `identity.tagline: "AI for dentists"` → footer renders the configured tagline |
| P16 | `tool filtering respects disabled list` | `tools.json` with `disabled: ["calculator"]` → tool registry does not contain `calculator` tool, still contains `search_corpus` |
| P17 | `tool filtering respects enabled list` | `tools.json` with `enabled: ["calculator"]` → only `calculator` tool registered |
| P18 | `config values cached after first load` | Call `getInstanceIdentity()` twice → second call returns same object reference (cache hit), file system read happens once |
| P19 | `partial identity.json merges with defaults` | Identity file has only `name` and `shortName` → other fields (`tagline`, `logoPath`, `markText`) use hardcoded defaults |
| P20 | `services.json with empty offerings array` | `offerings: []`, `bookingEnabled: false` → valid config, no service chips or offerings available |

### §5.2 Negative tests (invalid states prevented)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `throws ConfigValidationError for malformed JSON` | `identity.json` contains `{name: unquoted}` → throws `ConfigValidationError` with `file: "identity.json"` |
| N2 | `throws ConfigValidationError when identity.name is empty` | `identity.json` with `name: ""` → error includes `"identity.name: required non-empty string"` |
| N3 | `throws ConfigValidationError when identity.name exceeds max length` | `name` of 101 characters → error includes `"identity.name: max 100 characters"` |
| N4 | `throws ConfigValidationError when identity.domain has protocol prefix` | `domain: "https://example.com"` → error includes `"identity.domain: must not include protocol"` |
| N5 | `throws ConfigValidationError when identity.logoPath missing leading slash` | `logoPath: "logo.png"` → error includes `"identity.logoPath: must start with /"` |
| N6 | `collects all validation errors before throwing` | `identity.json` with `name: ""`, `shortName: ""`, `markText: ""` → error `.violations` has 3 entries, not just the first |
| N7 | `throws ConfigValidationError for non-object JSON` | `identity.json` contains `"just a string"` → error includes `"identity.json must be a JSON object"` |
| N8 | `throws ConfigValidationError when services.offerings[].lane is invalid` | Offering with `lane: "enterprise"` → error includes `"offerings[0].lane: must be organization, individual, or both"` |
| N9 | `throws ConfigValidationError when services.offerings[].estimatedPrice is negative` | `estimatedPrice: -100` → error includes `"offerings[0].estimatedPrice: must be non-negative integer"` |
| N10 | `throws ConfigValidationError when services.bookingEnabled is missing` | `services.json` with offerings but no `bookingEnabled` → error includes `"services.bookingEnabled: required boolean"` |
| N11 | `throws ConfigValidationError when prompts.personality exceeds max length` | `personality` string of 5001 characters → error includes max length violation |
| N12 | `throws ConfigValidationError when tools.enabled contains empty string` | `enabled: ["calculator", "", "search_corpus"]` → error includes `"tools.enabled[1]: must be non-empty string"` |

### §5.3 Edge tests (boundary conditions)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `config directory does not exist` | `CONFIG_DIR` points to non-existent path → all getters return hardcoded defaults, no throw |
| E2 | `config directory exists but is empty` | Empty `config/` directory → all getters return hardcoded defaults |
| E3 | `identity.json exists but other files missing` | Only `identity.json` present → identity reads from file, prompts/services/tools use defaults |
| E4 | `CONFIG_DIR env var overrides default path` | Set `CONFIG_DIR=/custom/path` → loader reads from that path instead of `config/` |
| E5 | `config with Unicode brand name` | `name: "ストゥディオ・オルド"` → loads correctly, no encoding errors |
| E6 | `config with maximum-length fields at boundary` | `name` at exactly 100 characters → valid, no error |
| E7 | `tools.json with both enabled and disabled containing same tool` | `enabled: ["calculator"]`, `disabled: ["calculator"]` → `calculator` is disabled (disabled wins) |
| E8 | `tools.json with unknown tool IDs` | `enabled: ["future_tool_v2"]` → silently ignored, no error, no registered tools match |
| E9 | `services.json with offerings[].id containing special characters` | `id: "my sprint!"` → error: `"offerings[0].id: alphanumeric and hyphens only"` |
| E10 | `identity.json with extra unknown fields` | File has `{ "name": "Acme", "unknownField": true, ... }` → extra fields silently ignored, known fields validated |
| E11 | `concurrent access to cached config` | Multiple synchronous calls to `getInstanceIdentity()` → all return same object, no race condition |
| E12 | `prompts.json with firstMessage but no personality` | `{ "firstMessage": { "default": "Hello!" } }` → valid, personality is `undefined`, firstMessage stored for Sprint 3 |
| E13 | `services.json with estimatedPrice at zero` | `estimatedPrice: 0` → valid (free offering is a legitimate business model) |

### §5.4 Integration tests

| # | Test name | What it verifies |
| --- | --- | --- |
| I1 | `system prompt includes configured brand name` | Load identity with `name: "Acme Dental"` → `createSystemPromptBuilder("AUTHENTICATED").build()` output contains `"Acme Dental"` |
| I2 | `system prompt falls back to hardcoded when no config` | No config files → prompt output is byte-identical to current `buildCorpusBasePrompt() + ROLE_DIRECTIVES.AUTHENTICATED` |
| I3 | `tool registry respects tools.json disabled list` | Config disables `calculator` → `getToolRegistry().getToolsForRole("AUTHENTICATED")` does not include calculator |
| I4 | `tool registry enables all tools when no tools.json` | No config → tool count for AUTHENTICATED matches current baseline (13 tools) |
| I5 | `release manifest reads configured app name` | With config `name: "Acme Dental"` → manifest generation uses that name |

### §5.5 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P20) | 20 |
| Negative (N1–N12) | 12 |
| Edge (E1–E13) | 13 |
| Integration (I1–I5) | 5 |
| **Total new tests** | **50** |
| Deleted tests | 0 |
| **Net change** | **+50** |

---

## §6 Test Implementation Patterns

### §6.1 Config fixture strategy

Tests use a temp directory with hand-crafted JSON files. No mocking of `fs` — the loader reads real files from a controlled path.

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), "config-test-"));
  process.env.CONFIG_DIR = configDir;
});

afterEach(() => {
  rmSync(configDir, { recursive: true });
  delete process.env.CONFIG_DIR;
  // Reset cached config
  resetConfigCache(); // exported for testing only
});

function writeConfig(filename: string, content: object) {
  writeFileSync(join(configDir, filename), JSON.stringify(content, null, 2));
}
```

### §6.2 Validation test pattern

```typescript
describe("config validation — negative tests", () => {
  it("N1: throws ConfigValidationError for malformed JSON", () => {
    writeFileSync(join(configDir, "identity.json"), "{name: unquoted}");
    expect(() => loadInstanceConfig()).toThrow(ConfigValidationError);
  });

  it("N6: collects all validation errors before throwing", () => {
    writeConfig("identity.json", { name: "", shortName: "", markText: "" });
    try {
      loadInstanceConfig();
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      expect((e as ConfigValidationError).violations.length).toBeGreaterThanOrEqual(3);
    }
  });
});
```

### §6.3 Integration test pattern (system prompt)

```typescript
describe("config identity integration", () => {
  it("I1: system prompt includes configured brand name", async () => {
    writeConfig("identity.json", {
      name: "Acme Dental",
      shortName: "Acme",
      tagline: "AI for dentists",
      description: "Smart dental practice",
      domain: "acmedental.com",
      logoPath: "/acme-logo.png",
      markText: "A",
    });

    const builder = await createSystemPromptBuilder("AUTHENTICATED");
    const prompt = builder.build();
    expect(prompt).toContain("Acme Dental");
    expect(prompt).not.toContain("Studio Ordo");
  });
});
```

---

## §7 Acceptance Criteria

1. `npm run build` produces zero TypeScript errors.
2. All 1194 existing tests pass without assertion changes.
3. All 50 new tests pass.
4. The system starts and behaves identically when the `config/` directory is deleted.
5. A deployer can change the brand name, tagline, logo, and system prompt personality by editing only `config/identity.json` and `config/prompts.json` — no TypeScript source changes required.
6. `package.json` name is `studio-ordo`.
7. The `config/` directory is committed with Studio Ordo flagship defaults.
8. Invalid config files produce clear, multi-error messages at startup — not silent failures or cryptic stack traces.
9. `ConfigIdentitySource` and `ConfigRoleDirectiveSource` correctly implement V0's `IdentitySource` and `RoleDirectiveSource` port interfaces.

---

## §8 Out of Scope

These are explicitly deferred to later sprints:

| Item | Deferred to |
| --- | --- |
| First-message greeting rendering | V1 Sprint 3 |
| Referral-aware greeting template | V1 Sprint 4 |
| Font reduction (8 → 3 families) | V1 Sprint 1 |
| Dashboard elimination | V1 Sprint 2 |
| QR code generation | V1 Sprint 4 |
| Booking / Stripe schema | V1 Sprints 8–9 |
| `APPRENTICE` role | V1 Sprint 4 |
| Blog routes | V1 Sprint 7 |
| Sitemap / robots.txt | V1 Sprint 6 |
| Runtime config hot-reload | V1 §10 PLAT-F09 (future) |

---

## §9 Sprint Boundary Verification

After Sprint 0 is complete, verify:

```text
1. npx vitest run                    → 1244 tests passing (1194 + 50 new)
2. npm run build                     → clean, zero errors
3. npm run lint                      → no new warnings
4. rm -rf config/ && npm run dev     → app starts, looks identical to before
5. Edit config/identity.json name    → shell brand, footer, chat header all reflect new name
6. Set tools.json disabled:["calculator"] → calculator tool absent from chat
```

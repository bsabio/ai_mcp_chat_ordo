# V1 Sprint 3 — First Message and Smart Greeting

> **Parent spec:** [Platform V1](spec.md) §8 Phase B, Sprint 3
> **Requirement IDs:** PLAT-003 (AI speaks first), PLAT-006 (configuration not code changes)
> **TD-A Baseline:** 1239 tests, 162 suites, build clean
> **Goal:** Make the chat greeting and suggestion chips config-driven via `prompts.json`. Expose prompts config to client components. Replace all hardcoded greeting copy in `chatState.ts` and `MessageList.tsx` with config reads. Preserve role-based variant support. Lay groundwork for referral-aware greeting (Sprint 4 wires the `?ref=` param; this sprint provides the rendering path).

---

## §1 Current State

### §1.1 How the greeting works today

The chat greeting is a single assistant message pre-loaded into the message list before the user types anything. The flow:

```text
ChatProvider (useGlobalChat.tsx)
  └─ useReducer(chatReducer, initialRole, createInitialChatMessages)
       └─ createInitialChatMessages(role)              [chatState.ts L61-64]
            └─ CHAT_BOOTSTRAP_COPY[role]                [chatState.ts L22-60]
                 └─ MessageFactory.createHeroMessage()   [MessageFactory.ts L33-36]
                      └─ ChatMessage with __suggestions__ tag embedded in content
```

The rendered hero state in `MessageList.tsx` displays two additional hardcoded elements:
- **BrandHeader** (L25–67): A display heading ("Bring me the workflow.") and subheading ("Paste a workflow, AI plan, or team handoff...") rendered above the message list when `isHeroState && !searchQuery`.
- **Service chips**: Already config-driven via `useInstanceIdentity().serviceChips`.

### §1.2 What's hardcoded

| Location | Hardcoded value | Line(s) |
| --- | --- | --- |
| `chatState.ts` L22–60 | `CHAT_BOOTSTRAP_COPY` — 4 role-specific messages + suggestions | Role messages and suggestion arrays |
| `MessageList.tsx` L52 | `"Bring me the workflow."` | Hero heading |
| `MessageList.tsx` L63 | `"Paste a workflow, AI plan, or team handoff..."` | Hero subheading |

### §1.3 What's already config-ready

| Capability | Config field | Schema | Status |
| --- | --- | --- | --- |
| Default first message | `prompts.firstMessage.default` | Validated, max 1000 chars | **Schema exists**, not consumed |
| Referral first message | `prompts.firstMessage.withReferral` | Validated, max 1000 chars | **Schema exists**, not consumed |
| Default suggestions | `prompts.defaultSuggestions` | Validated, max 6 items × 100 chars | **Schema exists**, not consumed |
| Service chips | `identity.serviceChips` | Validated, consumed by `useInstanceIdentity()` | **Working** |
| Brand identity | `identity.*` | Full config loader and context | **Working** |

### §1.4 Gap analysis

1. **Config context is identity-only.** `InstanceConfigContext` exposes `useInstanceIdentity()` but not `useInstancePrompts()`. Client components cannot access prompts config.
2. **`prompts.json` is empty.** The file exists but contains `{}`. No default greeting or suggestions are populated.
3. **No hero heading/subheading in config schema.** The BrandHeader heading and subheading are not in the `InstancePrompts` type. They need to be added to the schema.
4. **Role-based bootstrap is entirely hardcoded.** The 4-role `CHAT_BOOTSTRAP_COPY` map has no config override path.
5. **No referral interpolation.** The `withReferral` template field exists in the schema but there is no interpolation function to replace `{{referrer.name}}` or similar placeholders.

---

## §2 Design Decisions

### §2.1 Config-first, fallback-to-hardcoded

The system must work with `prompts.json = {}`. When config fields are absent, the current hardcoded values become the defaults. This is consistent with the Sprint 0 principle (V1 spec §11.3): "The system must work with no config files present."

### §2.2 Role-based greeting is a baseline behavior, not config

The 4-role `CHAT_BOOTSTRAP_COPY` map represents a _product decision_ about how different user segments are addressed. It is not deployer-configurable in Sprint 3 — deployers configure the ANONYMOUS greeting (the "front door" experience). Role-specific greetings remain hardcoded defaults that can be overridden in a future sprint if needed.

**Config override scope:**
- `prompts.firstMessage.default` → overrides the ANONYMOUS role message only.
- `prompts.defaultSuggestions` → overrides the ANONYMOUS role suggestions only.
- `prompts.heroHeading` → overrides "Bring me the workflow."
- `prompts.heroSubheading` → overrides "Paste a workflow, AI plan, or team handoff..."
- AUTHENTICATED, STAFF, ADMIN role greetings remain hardcoded in `chatState.ts`.

**Rationale:** The most impactful config surface is the anonymous visitor first impression. Role-specific greetings are operator-facing copy and are low-priority for deployer customization.

### §2.3 Referral message template renders but Sprint 4 wires it

Sprint 3 adds the rendering path: `prompts.firstMessage.withReferral` is read and can contain `{{referrer.name}}` placeholders. An interpolation utility is created. However, no `?ref=` parameter detection exists yet — Sprint 4 adds that. Sprint 3 tests verify the interpolation function works in isolation.

### §2.4 BrandHeader reads from config

The BrandHeader heading and subheading become props driven by config. The `InstancePrompts` type and schema gain `heroHeading` and `heroSubheading` optional fields.

### §2.5 Context extends, not replaces

`InstanceConfigContext` gains `prompts` alongside `identity`. The hook becomes `useInstancePrompts()` as a sibling to `useInstanceIdentity()`. No breaking change to existing consumers.

---

## §3 Implementation Plan

### Phase 1: Extend config schema and defaults

**Files modified:**
- `src/lib/config/defaults.ts` — Add `heroHeading` and `heroSubheading` to `InstancePrompts` type. Update `DEFAULT_PROMPTS` with current hardcoded values as defaults.
- `src/lib/config/instance.schema.ts` — Add validation for `heroHeading` (max 100 chars) and `heroSubheading` (max 300 chars) in `validatePrompts`.

**New default values in `DEFAULT_PROMPTS`:**
```typescript
export const DEFAULT_PROMPTS: InstancePrompts = {
  heroHeading: "Bring me the workflow.",
  heroSubheading: "Paste a workflow, AI plan, or team handoff. I'll show you what to fix, what to train, and what to build.",
  firstMessage: {
    default: "Describe the workflow problem, orchestration gap, or training goal.",
  },
  defaultSuggestions: [
    "Audit this workflow",
    "Stress-test this AI plan",
    "Train my team",
    "Show me the weak point",
  ],
};
```

### Phase 2: Extend InstanceConfigContext to expose prompts

**Files modified:**
- `src/lib/config/InstanceConfigContext.tsx` — Add `prompts` to context value. Add `useInstancePrompts()` hook. Update `InstanceConfigProvider` props to accept `prompts`.
- `src/app/layout.tsx` — Import `getInstancePrompts()`, pass `prompts` to `InstanceConfigProvider`.

### Phase 3: Wire config into chatState bootstrap

**Files modified:**
- `src/hooks/chat/chatState.ts` — `createInitialChatMessages` gains an optional `prompts` parameter. When provided and the role is ANONYMOUS, uses `prompts.firstMessage.default` and `prompts.defaultSuggestions` instead of `CHAT_BOOTSTRAP_COPY.ANONYMOUS`. Other roles retain hardcoded copy.
- `src/hooks/useGlobalChat.tsx` — Reads `useInstancePrompts()` and passes to `createInitialChatMessages`.

**Signature change:**
```typescript
export function createInitialChatMessages(
  role: RoleName = "ANONYMOUS",
  prompts?: InstancePrompts,
): ChatMessage[]
```

### Phase 4: Wire config into BrandHeader

**Files modified:**
- `src/frameworks/ui/MessageList.tsx` — `BrandHeader` receives `heroHeading` and `heroSubheading` props from config. `MessageList` reads `useInstancePrompts()` and passes values down. Falls back to `DEFAULT_PROMPTS` values when undefined.

### Phase 5: Create referral interpolation utility

**New file:**
- `src/lib/chat/greeting-interpolator.ts` — Pure function: `interpolateGreeting(template: string, context: GreetingContext): string`. Replaces `{{referrer.name}}`, `{{referrer.credential}}`, `{{brand.name}}` placeholders. Returns the template unchanged if no placeholders found.

### Phase 6: Populate prompts.json with flagship config

**Files modified:**
- `config/prompts.json` — Populated with Studio Ordo's greeting, hero text, and suggestions.

### Phase 7: Update affected tests

**Files modified:**
- Existing test files that reference hardcoded greeting strings need updating to use the new defaults or config mocking pattern.
- New test file created for Sprint 3 verification.

---

## §4 Referral Interpolation Design

### §4.1 Template syntax

```text
Welcome — I see you were introduced by {{referrer.name}}, 
a {{referrer.credential}} in the Enterprise AI program.
```

### §4.2 Supported placeholders

| Placeholder | Source | Fallback |
| --- | --- | --- |
| `{{referrer.name}}` | Referral record join to users table | `"a colleague"` |
| `{{referrer.credential}}` | User metadata (future) | `"Enterprise AI practitioner"` |
| `{{brand.name}}` | `identity.name` from config | `"Studio Ordo"` |

### §4.3 Function signature

```typescript
interface GreetingContext {
  referrer?: {
    name?: string;
    credential?: string;
  };
  brand: {
    name: string;
  };
}

export function interpolateGreeting(
  template: string,
  context: GreetingContext,
): string;
```

### §4.4 Fallback behavior

- Missing `referrer.name` → inserts `"a colleague"`
- Missing `referrer.credential` → inserts `"Enterprise AI practitioner"`
- Missing `brand.name` → inserts `"Studio Ordo"` (should never happen with config defaults)
- Template with no `{{...}}` placeholders → returned unchanged
- Empty template → returned as empty string

---

## §5 Test Specification

### §5.1 Positive tests (config wiring works)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `InstanceConfigContext exposes prompts via useInstancePrompts` | Render a component inside `InstanceConfigProvider` with `prompts` prop. `useInstancePrompts()` returns the provided prompts object. |
| P2 | `createInitialChatMessages uses config firstMessage for ANONYMOUS` | Call `createInitialChatMessages("ANONYMOUS", promptsWithCustomMessage)`. The returned message content contains the custom message, not the hardcoded default. |
| P3 | `createInitialChatMessages uses config defaultSuggestions for ANONYMOUS` | Call with custom `defaultSuggestions`. The returned message content contains the custom suggestion strings as `__suggestions__` tags. |
| P4 | `BrandHeader renders heroHeading from config` | Render `MessageList` in hero state with prompts providing custom `heroHeading`. The custom heading text appears in the DOM. |
| P5 | `BrandHeader renders heroSubheading from config` | Render `MessageList` in hero state with prompts providing custom `heroSubheading`. The custom subheading text appears in the DOM. |
| P6 | `interpolateGreeting replaces referrer.name placeholder` | `interpolateGreeting("Hi from {{referrer.name}}", { referrer: { name: "Maria Chen" }, brand: { name: "Ordo" } })` → `"Hi from Maria Chen"`. |
| P7 | `interpolateGreeting replaces brand.name placeholder` | Template with `{{brand.name}}` → replaced with provided brand name. |
| P8 | `interpolateGreeting replaces multiple placeholders in one template` | Template with both `{{referrer.name}}` and `{{brand.name}}` → both replaced correctly. |
| P9 | `prompts.json is populated with valid config` | Read `config/prompts.json`, parse, validate with `validatePrompts`. Returns a valid `InstancePrompts` object (no errors). |
| P10 | `DEFAULT_PROMPTS contains heroHeading and heroSubheading` | Import `DEFAULT_PROMPTS` from defaults. Both fields are non-empty strings. |
| P11 | `layout.tsx passes prompts to InstanceConfigProvider` | Static analysis: `layout.tsx` source contains `getInstancePrompts()` call and passes `prompts` prop to `InstanceConfigProvider`. |
| P12 | `chatState.ts accepts optional prompts parameter` | Static analysis: `createInitialChatMessages` function signature includes `prompts?` parameter. |

### §5.2 Negative tests (boundaries enforced)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `createInitialChatMessages ignores config for non-ANONYMOUS roles` | Call with role `"ADMIN"` and custom prompts. The returned message contains the hardcoded ADMIN copy, not the config message. |
| N2 | `createInitialChatMessages falls back to hardcoded when prompts is undefined` | Call with `"ANONYMOUS"` and no prompts parameter. Returns the original hardcoded ANONYMOUS message and suggestions. |
| N3 | `createInitialChatMessages falls back when firstMessage.default is undefined` | Call with `"ANONYMOUS"` and `prompts = {}`. Returns the hardcoded default message. |
| N4 | `interpolateGreeting returns template unchanged when no placeholders present` | Input `"Hello, welcome!"` with full context → returns `"Hello, welcome!"` unchanged. |
| N5 | `validatePrompts rejects heroHeading longer than 100 characters` | `validatePrompts({ heroHeading: "x".repeat(101) })` → returns error array containing max length violation. |
| N6 | `validatePrompts rejects heroSubheading longer than 300 characters` | `validatePrompts({ heroSubheading: "x".repeat(301) })` → returns error array containing max length violation. |
| N7 | `useInstancePrompts returns DEFAULT_PROMPTS when no provider wraps component` | Render a component outside any provider. `useInstancePrompts()` returns `DEFAULT_PROMPTS`. |
| N8 | `BrandHeader falls back to default heading when prompts.heroHeading is undefined` | Render in hero state with `prompts = {}`. "Bring me the workflow." still appears. |

### §5.3 Edge tests (template interpolation and config merging)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `interpolateGreeting uses fallback for missing referrer.name` | Template with `{{referrer.name}}` but `referrer: {}` → inserts `"a colleague"`. |
| E2 | `interpolateGreeting uses fallback for missing referrer.credential` | Template with `{{referrer.credential}}` but no credential → inserts `"Enterprise AI practitioner"`. |
| E3 | `interpolateGreeting handles undefined referrer object` | Template with `{{referrer.name}}` but `referrer` is `undefined` → inserts fallback. |
| E4 | `interpolateGreeting handles empty template string` | `interpolateGreeting("", context)` → returns `""`. |
| E5 | `config prompts merge with defaults preserving unset fields` | `loadInstanceConfig()` with `prompts.json = { "heroHeading": "Custom" }` → merged result has custom `heroHeading` but default `heroSubheading`, default `firstMessage`, default `defaultSuggestions`. |
| E6 | `createInitialChatMessages with partial prompts uses defaults for missing fields` | Call with prompts that has `firstMessage.default` but no `defaultSuggestions` → uses config message but hardcoded default suggestions. |
| E7 | `BrandHeader hero renders correctly when prompts has only heroHeading` | Provide only `heroHeading` via prompts. Custom heading appears; default subheading appears. |
| E8 | `interpolateGreeting preserves unrecognized placeholders` | Template `"Hi {{unknown.field}}"` → returns `"Hi {{unknown.field}}"` unchanged (does not crash, does not strip). |

### §5.4 Test count summary

| Category | Count |
| --- | --- |
| Positive (P1–P12) | 12 |
| Negative (N1–N8) | 8 |
| Edge (E1–E8) | 8 |
| **Total new tests** | **28** |
| Deleted tests | 0 |
| **Net change** | **+28** |

Note: The V1 spec §8 estimated +12 tests for Sprint 3. This spec adds 28 tests because the implementation touches the config pipeline (schema → loader → context → consumer), the greeting interpolation engine, and the BrandHeader component — each needing positive, negative, and edge coverage. The extra 16 tests ensure that config fallbacks, partial config, and template edge cases are verified, preventing regressions when Sprint 4 adds referral parameter wiring.

---

## §6 Test Implementation Patterns

### §6.1 Config context tests (P1, N7)

```typescript
import { render, screen } from "@testing-library/react";
import { InstanceConfigProvider, useInstancePrompts } from "@/lib/config/InstanceConfigContext";
import { DEFAULT_PROMPTS, type InstancePrompts } from "@/lib/config/defaults";

function PromptsProbe() {
  const prompts = useInstancePrompts();
  return <div data-testid="heading">{prompts.heroHeading ?? "none"}</div>;
}

it("P1: InstanceConfigContext exposes prompts via useInstancePrompts", () => {
  const testPrompts: InstancePrompts = {
    ...DEFAULT_PROMPTS,
    heroHeading: "Custom heading",
  };
  render(
    <InstanceConfigProvider identity={DEFAULT_IDENTITY} prompts={testPrompts}>
      <PromptsProbe />
    </InstanceConfigProvider>
  );
  expect(screen.getByTestId("heading")).toHaveTextContent("Custom heading");
});
```

### §6.2 Bootstrap message tests (P2, P3, N1, N2, N3, E6)

```typescript
import { createInitialChatMessages } from "@/hooks/chat/chatState";
import type { InstancePrompts } from "@/lib/config/defaults";

it("P2: createInitialChatMessages uses config firstMessage for ANONYMOUS", () => {
  const prompts: InstancePrompts = {
    firstMessage: { default: "Welcome to our dental practice." },
  };
  const [msg] = createInitialChatMessages("ANONYMOUS", prompts);
  expect(msg.content).toContain("Welcome to our dental practice.");
});

it("N1: createInitialChatMessages ignores config for non-ANONYMOUS roles", () => {
  const prompts: InstancePrompts = {
    firstMessage: { default: "This should not appear for ADMIN." },
  };
  const [msg] = createInitialChatMessages("ADMIN", prompts);
  expect(msg.content).toContain("Operator console is ready");
  expect(msg.content).not.toContain("This should not appear");
});
```

### §6.3 Interpolation tests (P6, P7, P8, N4, E1–E4, E8)

```typescript
import { interpolateGreeting } from "@/lib/chat/greeting-interpolator";

it("P6: interpolateGreeting replaces referrer.name placeholder", () => {
  const result = interpolateGreeting(
    "Hi from {{referrer.name}}",
    { referrer: { name: "Maria Chen" }, brand: { name: "Ordo" } },
  );
  expect(result).toBe("Hi from Maria Chen");
});

it("E1: interpolateGreeting uses fallback for missing referrer.name", () => {
  const result = interpolateGreeting(
    "Introduced by {{referrer.name}}",
    { referrer: {}, brand: { name: "Ordo" } },
  );
  expect(result).toBe("Introduced by a colleague");
});
```

### §6.4 Static analysis tests (P11, P12)

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

it("P11: layout.tsx passes prompts to InstanceConfigProvider", () => {
  const src = readSource("src/app/layout.tsx");
  expect(src).toContain("getInstancePrompts()");
  expect(src).toMatch(/InstanceConfigProvider[^>]*prompts/);
});
```

---

## §7 File Change Summary

### §7.1 New files

| File | Purpose |
| --- | --- |
| `src/lib/chat/greeting-interpolator.ts` | Pure function for template placeholder interpolation |
| `tests/sprint-3-first-message.test.ts` | Sprint 3 verification tests (28 tests) |

### §7.2 Modified files

| File | Change |
| --- | --- |
| `src/lib/config/defaults.ts` | Add `heroHeading`, `heroSubheading` to `InstancePrompts` type. Populate `DEFAULT_PROMPTS` with hardcoded fallback values. |
| `src/lib/config/instance.schema.ts` | Add validation for `heroHeading` (max 100) and `heroSubheading` (max 300) in `validatePrompts`. |
| `src/lib/config/InstanceConfigContext.tsx` | Extend context to include `prompts`. Add `useInstancePrompts()` hook. Update `InstanceConfigProvider` props. |
| `src/app/layout.tsx` | Import `getInstancePrompts()`. Pass `prompts` to `InstanceConfigProvider`. |
| `src/hooks/chat/chatState.ts` | `createInitialChatMessages` gains optional `prompts` param. ANONYMOUS role uses config when provided. |
| `src/hooks/useGlobalChat.tsx` | Import `useInstancePrompts()`. Pass prompts to `createInitialChatMessages`. |
| `src/frameworks/ui/MessageList.tsx` | `BrandHeader` receives heading/subheading from prompts config. `MessageList` reads `useInstancePrompts()`. |
| `config/prompts.json` | Populated with Studio Ordo flagship greeting, hero heading, hero subheading, and default suggestions. |

### §7.3 Existing tests requiring updates

The following existing test files contain hardcoded greeting strings that may need updating to account for the new config-driven flow:

| Test file | Hardcoded reference | Impact |
| --- | --- | --- |
| `src/hooks/useGlobalChat.test.tsx` | `"Describe the workflow problem"`, `"Welcome back"`, `"Operator console"` | Tests still pass if `createInitialChatMessages` defaults are unchanged when prompts is undefined. **No change needed** — tests call `ChatProvider` which has no prompts override, so hardcoded defaults apply. |
| `src/frameworks/ui/MessageList.test.tsx` | `"Bring me the workflow."` | Tests may need to mock `useInstancePrompts()` or will pass with default. **Verify after implementation.** |
| `tests/homepage-shell-ownership.test.tsx` | Bootstrap message content | Will pass unchanged — tests create messages directly, not via config path. |
| `tests/homepage-shell-layout.test.tsx` | Bootstrap message content | Same — direct message creation, unaffected. |
| `tests/homepage-shell-evals.test.tsx` | Bootstrap message content | Same — direct message creation, unaffected. |

---

## §8 Acceptance Criteria

1. With `prompts.json = {}`, the application behaves identically to pre-Sprint-3 (all hardcoded defaults apply).
2. With `prompts.json` containing `firstMessage.default`, `defaultSuggestions`, `heroHeading`, and `heroSubheading`, the ANONYMOUS greeting and hero header reflect the config values.
3. Non-ANONYMOUS roles (AUTHENTICATED, STAFF, ADMIN) continue using their hardcoded role-specific greetings regardless of config.
4. `useInstancePrompts()` returns the merged prompts config when inside `InstanceConfigProvider`, and `DEFAULT_PROMPTS` when outside.
5. `interpolateGreeting` correctly replaces `{{referrer.name}}`, `{{referrer.credential}}`, and `{{brand.name}}` placeholders.
6. `interpolateGreeting` uses fallback values when referrer data is missing.
7. `interpolateGreeting` returns input unchanged when no placeholders are present.
8. Schema validation rejects `heroHeading` > 100 chars and `heroSubheading` > 300 chars.
9. The prompts config merges with defaults — partial config fills in missing fields from `DEFAULT_PROMPTS`.
10. All 28 new tests pass.
11. All pre-existing tests pass (1239 baseline).
12. Build clean. Lint clean (no new issues).

---

## §9 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Existing tests break from provider changes | Medium | `InstanceConfigProvider` adds `prompts` as optional prop with default. Existing usages that omit it get defaults silently. |
| `useInstancePrompts()` called in tests without provider | Low | Default context value set to `DEFAULT_PROMPTS` (same pattern as `useInstanceIdentity()`). |
| MessageList test fragility from hardcoded strings | Medium | Sprint 3 tests verify config-driven behavior. Existing tests verified to pass with defaults. |
| Deep merge complexity for nested config | Low | Merge is shallow per key (same as Sprint 0 `mergePrompts`). New fields are top-level on `InstancePrompts`. |
| V1 spec `referralSuggestions` not addressed | Low | V1 spec §3.2 defines `referralSuggestions` (alternate chips for referred visitors). Intentionally deferred to Sprint 4 alongside `?ref=` parameter wiring. Sprint 3 only builds the interpolation utility. |

---

## §10 Definition of Done

Sprint 3 is complete when:

1. A deployer can set `prompts.json` fields and see their custom greeting, hero heading, hero subheading, and suggestion chips on the anonymous homepage — without editing any TypeScript.
2. The application works identically with `prompts.json = {}` as it did before Sprint 3.
3. The referral interpolation utility is tested and ready for Sprint 4 to wire with `?ref=` parameters.
4. 28 new tests pass. Total suite: 1239 + 28 = **1267** tests.
5. Build clean. Lint clean.

### §10.1 V1 spec update

After Sprint 3 is implemented, update [spec.md](spec.md):
- §7.3 test baseline → 1267 tests
- §8 Sprint 3 estimated tests → +28

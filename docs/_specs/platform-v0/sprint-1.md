# Sprint 1 — SystemPromptBuilder

> **Parent spec:** [Platform V0](spec.md) §7 Sprint 1
> **Requirement IDs:** FND-001, FND-002
> **Goal:** Replace ad-hoc string concatenation with a declarative builder. Both routes produce identical prompts for the same inputs. Zero behavior change — output parity with the current system.
> **Historical note (2026-03-24):** This sprint records the V0 builder boundary as it existed then. Later convergence work renamed the active handoff path from `dashboard-handoff.ts` to `task-origin-handoff.ts`. References below to the older dashboard-named handoff file are historical V0 context rather than the current runtime path.

---

## §1 Current State (What We're Replacing)

### §1.1 Entry point — `src/lib/chat/policy.ts`

```typescript
const BASE_PROMPT = buildCorpusBasePrompt();          // computed once at module load

export async function buildSystemPrompt(role: RoleName): Promise<string> {
  const db = getDb();
  const innerRepo = new SystemPromptDataMapper(db);
  const promptRepo = new DefaultingSystemPromptRepository(innerRepo, BASE_PROMPT, ROLE_DIRECTIVES);
  const interactor = new LoggingDecorator(new ChatPolicyInteractor(promptRepo), "ChatPolicy");
  return interactor.execute({ role });
}
```

### §1.2 Concatenation — `src/core/use-cases/ChatPolicyInteractor.ts`

```typescript
async execute({ role }: { role: RoleName }): Promise<string> {
  const base = await this.promptRepo.getActive("ALL", "base");
  const directive = await this.promptRepo.getActive(role, "role_directive");
  return (base?.content ?? "") + (directive?.content ?? "");
}
```

### §1.3 Context blocks — appended in `src/app/api/chat/stream/route.ts`

```typescript
let systemPrompt = await buildSystemPrompt(role);
// ... later, after building context window:
if (ctx.summaryText) {
  systemPrompt += buildSummaryContextBlock(ctx.summaryText);
}
systemPrompt += buildRoutingContextBlock(routingSnapshot);
if (dashboardHandoff) {
  systemPrompt += buildDashboardHandoffContextBlock(dashboardHandoff);
}
```

### §1.4 Non-streaming route — `src/app/api/chat/route.ts`

```typescript
const systemPrompt = await buildSystemPrompt(role);
// NO context blocks appended — no summary, no routing, no dashboard
```

### §1.5 Problems this creates

1. Adding a new section means editing the interactor or the route handler.
2. Streaming and non-streaming paths produce different prompts for the same session state.
3. Context block ordering is implicit (order of `+=` statements).
4. No way to test the composed prompt without invoking the full route.

---

## §2 Target Architecture

### §2.1 New files

| File | Layer | Purpose |
| --- | --- | --- |
| `src/core/use-cases/SystemPromptBuilder.ts` | Core | Builder class with section composition |
| `src/core/ports/IdentitySource.ts` | Core | Interface for identity block |
| `src/core/ports/RoleDirectiveSource.ts` | Core | Interface for role directive block |
| `src/adapters/HardcodedIdentitySource.ts` | Adapter | Wraps `buildCorpusBasePrompt()` |
| `src/adapters/HardcodedRoleDirectiveSource.ts` | Adapter | Wraps `ROLE_DIRECTIVES` |
| `tests/system-prompt-builder.test.ts` | Test | Builder unit + parity tests |

### §2.2 Modified files

| File | Change |
| --- | --- |
| `src/lib/chat/policy.ts` | Export `createSystemPromptBuilder()`; preserve `buildSystemPrompt()` for backward compatibility |
| `src/app/api/chat/stream/route.ts` | Use builder; remove manual `+=` context block appends |
| `src/app/api/chat/route.ts` | Use builder (identity + role directive only — matching current behavior; context blocks deferred to Sprint 3) |

### §2.3 Unchanged files (must verify no breakage)

| File | Why unchanged |
| --- | --- |
| `src/core/use-cases/ChatPolicyInteractor.ts` | Preserved for existing test fixtures. Builder replaces it in production code path; interactor is not modified. |
| `src/lib/corpus-config.ts` | Still provides the identity string — now via `HardcodedIdentitySource` |
| `src/core/use-cases/DefaultingSystemPromptRepository.ts` | Still provides fallback — builder reads through it |
| `src/adapters/SystemPromptDataMapper.ts` | Raw DB adapter, no changes |
| `src/lib/chat/summary-context.ts` | Builder calls `buildSummaryContextBlock()` internally |
| `src/lib/chat/routing-context.ts` | Builder calls `buildRoutingContextBlock()` internally |
| `src/lib/chat/dashboard-handoff.ts` | Builder calls `buildDashboardHandoffContextBlock()` internally |

---

## §3 Implementation Details

### §3.1 `src/core/ports/IdentitySource.ts`

```typescript
export interface IdentitySource {
  getIdentity(): string;
}
```

Single method. V0 has `HardcodedIdentitySource`. V1 will add `ConfigIdentitySource` reading `identity.json`.

### §3.2 `src/core/ports/RoleDirectiveSource.ts`

```typescript
import type { RoleName } from "@/core/entities/user";

export interface RoleDirectiveSource {
  getDirective(role: RoleName): string;
}
```

### §3.3 `src/adapters/HardcodedIdentitySource.ts`

```typescript
import type { IdentitySource } from "@/core/ports/IdentitySource";
import { buildCorpusBasePrompt } from "@/lib/corpus-config";

export class HardcodedIdentitySource implements IdentitySource {
  private readonly identity: string;

  constructor() {
    this.identity = buildCorpusBasePrompt();
  }

  getIdentity(): string {
    return this.identity;
  }
}
```

Computes the identity string once at construction, matching current behavior (`const BASE_PROMPT = buildCorpusBasePrompt()` at module load).

### §3.4 `src/adapters/HardcodedRoleDirectiveSource.ts`

```typescript
import type { RoleDirectiveSource } from "@/core/ports/RoleDirectiveSource";
import type { RoleName } from "@/core/entities/user";
import { ROLE_DIRECTIVES } from "@/core/use-cases/ChatPolicyInteractor";

export class HardcodedRoleDirectiveSource implements RoleDirectiveSource {
  getDirective(role: RoleName): string {
    return ROLE_DIRECTIVES[role] ?? "";
  }
}
```

### §3.5 `src/core/use-cases/SystemPromptBuilder.ts`

```typescript
import type { RoleName } from "@/core/entities/user";
import type { IdentitySource } from "@/core/ports/IdentitySource";
import type { RoleDirectiveSource } from "@/core/ports/RoleDirectiveSource";
import type { ConversationRoutingSnapshot } from "@/core/entities/conversation-routing";
import { buildSummaryContextBlock } from "@/lib/chat/summary-context";
import { buildRoutingContextBlock } from "@/lib/chat/routing-context";

export interface PromptSection {
  key: string;
  content: string;
  priority: number;
}

/**
 * V0 simplification: The parent spec (§3.1) defines PromptSection with a `header` field.
 * V0 omits `header` because current context blocks embed headers in the content string.
 * If V1 needs structured headers, `header` can be added without breaking existing callers.
 *
 * Priority assignments:
 *   10 — identity (base prompt)
 *   20 — role directive
 *   30 — user preferences (Sprint 2)
 *   40 — conversation summary
 *   50 — routing context
 *   60 — referral context (V1)
 *   90 — ad-hoc sections (dashboard handoff, etc.)
 */

export class SystemPromptBuilder {
  private sections = new Map<string, PromptSection>();

  withIdentity(source: IdentitySource): this {
    const content = source.getIdentity();
    if (content) {
      this.sections.set("identity", { key: "identity", content, priority: 10 });
    }
    return this;
  }

  withRoleDirective(source: RoleDirectiveSource, role: RoleName): this {
    const content = source.getDirective(role);
    if (content) {
      this.sections.set("role_directive", { key: "role_directive", content, priority: 20 });
    }
    return this;
  }

  withConversationSummary(summaryText: string | null): this {
    if (summaryText) {
      this.sections.set("summary", {
        key: "summary",
        content: buildSummaryContextBlock(summaryText),
        priority: 40,
      });
    }
    return this;
  }

  withRoutingContext(snapshot: ConversationRoutingSnapshot): this {
    const content = buildRoutingContextBlock(snapshot);
    if (content) {
      this.sections.set("routing", { key: "routing", content, priority: 50 });
    }
    return this;
  }

  withSection(section: PromptSection): this {
    this.sections.set(section.key, section);
    return this;
  }

  build(): string {
    if (this.sections.size === 0) return "";

    const ordered = [...this.sections.values()].sort(
      (a, b) => a.priority - b.priority,
    );
    return ordered.map((s) => s.content).join("");
  }
}
```

**Key design decisions:**

- `join("")` — no separator. Current code does `base.content + directive.content` (no separator) and context blocks start with `"\n"` internally. Builder preserves this exactly.
- Empty/null content is skipped — calling `withConversationSummary(null)` is a no-op.
- Sections are keyed — calling `withSection` with the same key replaces the previous. Prevents accidental duplication.
- `build()` sorts by priority, so ordering is deterministic regardless of call order.

### §3.6 Updated `src/lib/chat/policy.ts`

**Design decision:** The builder stays pure and synchronous. The caller resolves prompt content from the DB *before* configuring the builder. This preserves exact parity with the current system: identity and role directive still come from `DefaultingSystemPromptRepository`, which reads the `system_prompts` table first and falls back to hardcoded defaults (via `buildCorpusBasePrompt()` and `ROLE_DIRECTIVES`). Admin-modified prompts in the DB are respected.

The `IdentitySource` and `RoleDirectiveSource` interfaces are still created as V1 extension points (V1 Sprint A-0 introduces `ConfigIdentitySource` / `ConfigRoleDirectiveSource`), but V0 does not use them in the production code path — it feeds resolved content to the builder via `withSection()`.

```typescript
import { getDb } from "@/lib/db/connection";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { SystemPromptBuilder } from "@/core/use-cases/SystemPromptBuilder";
import { ROLE_DIRECTIVES } from "@/core/use-cases/ChatPolicyInteractor";
import { buildCorpusBasePrompt } from "@/lib/corpus-config";
import type { RoleName } from "@/core/entities/user";

const BASE_PROMPT = buildCorpusBasePrompt();

export async function createSystemPromptBuilder(role: RoleName): Promise<SystemPromptBuilder> {
  const db = getDb();
  const innerRepo = new SystemPromptDataMapper(db);
  const promptRepo = new DefaultingSystemPromptRepository(innerRepo, BASE_PROMPT, ROLE_DIRECTIVES);

  const base = await promptRepo.getActive("ALL", "base");
  const directive = await promptRepo.getActive(role, "role_directive");

  return new SystemPromptBuilder()
    .withSection({ key: "identity", content: base?.content ?? "", priority: 10 })
    .withSection({ key: "role_directive", content: directive?.content ?? "", priority: 20 });
}

// Preserved for backward compatibility during migration
export async function buildSystemPrompt(role: RoleName): Promise<string> {
  const builder = await createSystemPromptBuilder(role);
  return builder.build();
}
```

`ChatPolicyInteractor` is not modified — it remains a valid code path for existing test fixtures.

### §3.7 Updated `src/app/api/chat/stream/route.ts`

Replace the manual `+=` appends with builder methods:

```typescript
// BEFORE:
let systemPrompt = await buildSystemPrompt(role);
// ... later:
if (ctx.summaryText) {
  systemPrompt += buildSummaryContextBlock(ctx.summaryText);
}
systemPrompt += buildRoutingContextBlock(routingSnapshot);
if (dashboardHandoff) {
  systemPrompt += buildDashboardHandoffContextBlock(dashboardHandoff);
}

// AFTER:
const builder = await createSystemPromptBuilder(role);
// ... later:
builder.withConversationSummary(ctx.summaryText);
builder.withRoutingContext(routingSnapshot);
if (dashboardHandoff) {
  builder.withSection({
    key: "dashboard_handoff",
    content: buildDashboardHandoffContextBlock(dashboardHandoff),
    priority: 90,
  });
}
const systemPrompt = builder.build();
```

### §3.8 Updated `src/app/api/chat/route.ts`

The non-streaming route now gains context it currently lacks:

```typescript
// BEFORE:
const systemPrompt = await buildSystemPrompt(role);
// (no context blocks — degraded prompt)

// AFTER:
const builder = await createSystemPromptBuilder(role);
// Non-streaming route doesn't have conversation context currently,
// but the builder is now the single composition point.
// When this route gains conversation context in Sprint 3, it already
// has the builder ready.
const systemPrompt = builder.build();
```

**Note:** Full parity (non-streaming gets summary + routing) requires this route to also build a context window. That is outside Sprint 1 scope — Sprint 1's parity contract is: "builder output matches current output for each route." For the non-streaming route, that means identity + role_directive only (matching current behavior). Sprint 3 will add context to this route.

> **Scope deviation from spec task 1.6:** The parent spec describes this task as "gains summary, routing, dashboard context it currently lacks." However, adding context blocks to a route that never had them is a behavior change, not a refactor. The Sprint 1 goal is "zero behavior change — output parity," so we defer new context to Sprint 3 and preserve current behavior here. The builder infrastructure is ready — activating it is a one-line change per context block.

---

## §4 Task Breakdown

| # | Task | Files touched | Est. |
| --- | --- | --- | --- |
| 1.1 | Create `IdentitySource` interface | `src/core/ports/IdentitySource.ts` | S |
| 1.2 | Create `RoleDirectiveSource` interface | `src/core/ports/RoleDirectiveSource.ts` | S |
| 1.3 | Create `HardcodedIdentitySource` adapter | `src/adapters/HardcodedIdentitySource.ts` | S |
| 1.4 | Create `HardcodedRoleDirectiveSource` adapter | `src/adapters/HardcodedRoleDirectiveSource.ts` | S |
| 1.5 | Create `SystemPromptBuilder` class | `src/core/use-cases/SystemPromptBuilder.ts` | M |
| 1.6 | Update `policy.ts` — export `createSystemPromptBuilder()`, preserve `buildSystemPrompt()` | `src/lib/chat/policy.ts` | M |
| 1.7 | Update streaming route — use builder, remove `+=` appends | `src/app/api/chat/stream/route.ts` | M |
| 1.8 | Update non-streaming route — use builder | `src/app/api/chat/route.ts` | S |
| 1.9 | Write builder unit tests | `tests/system-prompt-builder.test.ts` | L |
| 1.10 | Write output parity tests | `tests/system-prompt-builder.test.ts` | L |
| 1.11 | Verify existing prompt tests still pass | `tests/system-prompt.test.ts`, `tests/core-policy.test.ts`, `tests/chat-policy.test.ts` | S |

**Execute order:** 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 1.10 → 1.11

---

## §5 Output Parity Contract

The acceptance criterion for Sprint 1 is byte-identical output. For each role:

```
currentOutput = (base.content ?? "") + (directive.content ?? "")
builderOutput = builder.build()
assert currentOutput === builderOutput
```

For the streaming route with context:

```
currentOutput = base + directive + summaryBlock + routingBlock + dashboardBlock
builderOutput = builder
  .withConversationSummary(summaryText)
  .withRoutingContext(snapshot)
  .withSection({ key: "dashboard_handoff", content: dashboardBlock, priority: 90 })
  .build()
assert currentOutput === builderOutput
```

This means:
- `build()` uses `join("")` (no separator) — blocks already include leading `\n`
- Section priority ordering: identity (10) < role_directive (20) < summary (40) < routing (50) < dashboard (90) — matches current `+=` append order
- Empty sections produce no output — `withConversationSummary(null)` is a no-op

---

## §6 Test Specification

### §6.1 Positive tests (expected behavior works)

| # | Test name | What it verifies |
| --- | --- | --- |
| P1 | `builder produces identity-only output when no other sections added` | `withSection({ key: "identity", ... }).build()` returns just the identity content |
| P2 | `builder produces identity + directive for each role` | For all 4 roles: `withSection("identity", ...).withSection("role_directive", ...).build()` matches `base.content + directive.content` |
| P3 | `sections are ordered by priority` | Add sections with priorities 50, 10, 30 → `build()` returns them in 10, 30, 50 order |
| P4 | `withConversationSummary appends summary block` | `withConversationSummary("test summary").build()` includes the summary context block text |
| P5 | `withRoutingContext appends routing block` | `withRoutingContext(snapshot).build()` includes routing metadata |
| P6 | `withSection adds ad-hoc section` | `withSection({ key: "custom", content: "custom text", priority: 90 }).build()` includes "custom text" |
| P7 | `all context blocks present simultaneously` | Builder with identity + directive + summary + routing + dashboard → output contains all in priority order |
| P8 | `ANONYMOUS role produces correct output` | Parity: builder output === current `ChatPolicyInteractor.execute({ role: "ANONYMOUS" })` |
| P9 | `AUTHENTICATED role produces correct output` | Parity: builder output === current `ChatPolicyInteractor.execute({ role: "AUTHENTICATED" })` |
| P10 | `STAFF role produces correct output` | Parity: builder output === current `ChatPolicyInteractor.execute({ role: "STAFF" })` |
| P11 | `ADMIN role produces correct output` | Parity: builder output === current `ChatPolicyInteractor.execute({ role: "ADMIN" })` |
| P12 | `streaming route context matches manual concatenation` | For a given summary + routing + dashboard combo, builder output matches current `base + directive + summaryBlock + routingBlock + dashboardBlock` |
| P13 | `HardcodedIdentitySource returns buildCorpusBasePrompt()` | Source output matches `buildCorpusBasePrompt()` call |
| P14 | `HardcodedRoleDirectiveSource returns correct directive per role` | For each role, source output matches `ROLE_DIRECTIVES[role]` |

### §6.2 Negative tests (invalid inputs handled correctly)

| # | Test name | What it verifies |
| --- | --- | --- |
| N1 | `build() returns empty string with no sections` | `new SystemPromptBuilder().build()` returns `""` |
| N2 | `withConversationSummary(null) is a no-op` | Builder with identity + `withConversationSummary(null)` → output has no summary block |
| N3 | `withConversationSummary("") is a no-op` | Empty string also skipped |
| N4 | `withSection with empty content is skipped` | `withSection({ key: "x", content: "", priority: 10 })` → build() returns `""` |
| N5 | `duplicate key replaces previous section` | `withSection({ key: "a", content: "first", ... }).withSection({ key: "a", content: "second", ... })` → output contains only "second" |

### §6.3 Edge tests (boundary conditions and special cases)

| # | Test name | What it verifies |
| --- | --- | --- |
| E1 | `sections with equal priority maintain insertion order` | Two sections with priority 50 → appear in the order they were added |
| E2 | `builder is reusable within a single build` | Calling `build()` twice on the same builder returns the same output |
| E3 | `builder handles very long identity string` | Identity string > 10,000 chars doesn't crash or truncate |
| E4 | `routing block with all-null snapshot fields` | `withRoutingContext(createConversationRoutingSnapshot())` produces valid output |
| E5 | `dashboard handoff as ad-hoc section sorts correctly` | Priority 90 section appears after priority 50 routing section |
| E6 | `withRoutingContext always produces content` | Even for default uncertain snapshot, routing block is non-empty (so section is added) |

### §6.4 Integration / parity tests

| # | Test name | What it verifies |
| --- | --- | --- |
| I1 | `buildSystemPrompt() returns same output before and after refactor` | For all 4 roles, call both old and new code paths, assert byte-identical |
| I2 | `createSystemPromptBuilder() respects DB-stored prompt` | Insert a custom prompt in DB → builder uses the DB version, not the hardcoded fallback |
| I3 | `createSystemPromptBuilder() falls back to hardcoded when DB is empty` | Empty `system_prompts` table → builder uses `buildCorpusBasePrompt()` + `ROLE_DIRECTIVES` |
| I4 | `streaming route builder output matches manual concatenation` | Mock all inputs → compare builder.build() to the old `systemPrompt += ...` pattern |

**Total new tests: 29** (14 positive + 5 negative + 6 edge + 4 integration/parity)

> **Note:** The parent spec §7 estimates 20 new tests; spec §6.1 sums to 24 across Sprint 1 areas (16 builder + 4 streaming + 4 non-streaming). This sprint doc arrives at 29 because it enumerates edge cases and adapter-specific tests not itemized in the high-level spec. The increase is justified — no tests should be cut to match the estimate.

---

## §7 Test Implementation Patterns

### §7.1 Builder unit tests — pure, no DB

```typescript
import { describe, it, expect } from "vitest";
import { SystemPromptBuilder } from "@/core/use-cases/SystemPromptBuilder";
import { createConversationRoutingSnapshot } from "@/core/entities/conversation-routing";

describe("SystemPromptBuilder", () => {
  it("P1: produces identity-only output", () => {
    const builder = new SystemPromptBuilder()
      .withSection({ key: "identity", content: "I am Ordo.", priority: 10 });
    expect(builder.build()).toBe("I am Ordo.");
  });

  it("P3: sections ordered by priority", () => {
    const builder = new SystemPromptBuilder()
      .withSection({ key: "c", content: "C", priority: 50 })
      .withSection({ key: "a", content: "A", priority: 10 })
      .withSection({ key: "b", content: "B", priority: 30 });
    expect(builder.build()).toBe("ABC");
  });

  it("N1: empty builder returns empty string", () => {
    expect(new SystemPromptBuilder().build()).toBe("");
  });

  it("N5: duplicate key replaces previous", () => {
    const builder = new SystemPromptBuilder()
      .withSection({ key: "a", content: "first", priority: 10 })
      .withSection({ key: "a", content: "second", priority: 10 });
    expect(builder.build()).toBe("second");
  });
});
```

### §7.2 Parity tests — DB-backed

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initializeSchema } from "@/lib/db/schema";
import { ChatPolicyInteractor, ROLE_DIRECTIVES } from "@/core/use-cases/ChatPolicyInteractor";
import { SystemPromptDataMapper } from "@/adapters/SystemPromptDataMapper";
import { DefaultingSystemPromptRepository } from "@/core/use-cases/DefaultingSystemPromptRepository";
import { SystemPromptBuilder } from "@/core/use-cases/SystemPromptBuilder";
import { buildCorpusBasePrompt } from "@/lib/corpus-config";
import type { RoleName } from "@/core/entities/user";

const ROLES: RoleName[] = ["ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"];

describe("Output parity — builder vs ChatPolicyInteractor", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeSchema(db);
  });

  for (const role of ROLES) {
    it(`I1: ${role} — builder output matches interactor output`, async () => {
      const repo = new DefaultingSystemPromptRepository(
        new SystemPromptDataMapper(db),
        buildCorpusBasePrompt(),
        ROLE_DIRECTIVES,
      );
      const interactor = new ChatPolicyInteractor(repo);
      const interactorOutput = await interactor.execute({ role });

      const base = await repo.getActive("ALL", "base");
      const directive = await repo.getActive(role, "role_directive");
      const builderOutput = new SystemPromptBuilder()
        .withSection({ key: "identity", content: base?.content ?? "", priority: 10 })
        .withSection({ key: "role_directive", content: directive?.content ?? "", priority: 20 })
        .build();

      expect(builderOutput).toBe(interactorOutput);
    });
  }
});
```

---

## §8 Risks and Mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| DB-stored prompt is different from hardcoded — parity test fails | Low (only if admin modified prompt) | Parity test reads through `DefaultingSystemPromptRepository` like the current code does |
| Context block functions return strings with leading `\n` — builder adds extra separator | Medium | Builder uses `join("")` with no separator; context block functions already include `\n` prefix |
| Non-streaming route behavior changes (gains context it didn't have) | N/A in Sprint 1 | Sprint 1 non-streaming route only gets identity + directive (same as today). Context blocks added in Sprint 3. |
| `ChatPolicyInteractor` still used by existing tests | Low | Interactor preserved; tests untouched. It remains a valid code path for test fixtures. |

---

## §9 Definition of Done

1. `SystemPromptBuilder` exists with `withSection`, `withConversationSummary`, `withRoutingContext`, and `build()`.
2. `IdentitySource` and `RoleDirectiveSource` interfaces exist in `src/core/ports/`.
3. `HardcodedIdentitySource` and `HardcodedRoleDirectiveSource` adapters exist as V1 extension points and test fixtures. (V0 production code path uses `DefaultingSystemPromptRepository` directly via `withSection()`.)
4. `createSystemPromptBuilder()` in `policy.ts` returns a configured builder.
5. Streaming route uses builder — no manual `+=` context block appends remain.
6. Non-streaming route uses builder.
7. All 29 new tests pass.
8. All existing tests pass (no regressions).
9. TypeScript compiles clean. Build succeeds. Lint passes.

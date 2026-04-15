# Sprint 1 — Full Prompt Contracts

> **Goal:** Harden the dynamic tool manifest beyond isolated section tests.
> Verify that the fully assembled system prompt preserves section ordering,
> contains exactly one role-scoped manifest, and never leaks raw tool names back
> into the base prompt or other prompt surfaces.
> **Spec ref:** §3.2, §3.3, §3.5, §5, §7
> **Prerequisite:** Sprint 0 complete

---

## Task 1.1 — End-to-end prompt assembly contract

**What:** Sprint 0 proved that `withToolManifest()` renders the right tool list
and that `ToolRegistry` returns the right per-role schemas. Sprint 1 adds an
integration contract that exercises the actual prompt assembly path used by chat:
identity → tool_manifest → role_directive → user_preferences → summary → routing.

| Item | Detail |
| --- | --- |
| **Create** | `tests/system-prompt-assembly.test.ts` |
| **Spec** | §3.5, §5 |

### Test design

Create a `SystemPromptBuilder`, inject a real base prompt from
`buildCorpusBasePrompt()`, a real role directive from `ROLE_DIRECTIVES`, and a
manifest built from `getToolRegistry().getSchemasForRole(role)`. Add synthetic
summary and routing sections so ordering can be asserted on the final built
string.

### Test scenarios

| Test ID | Scenario |
| --- | --- |
| PROMPT-ASM-01 | Built prompt orders sections as: identity → tool_manifest → role_directive → summary → routing |
| PROMPT-ASM-02 | Built prompt contains exactly one `TOOLS AVAILABLE TO YOU:` block |
| PROMPT-ASM-03 | ANONYMOUS built prompt contains only anonymous tool names in the manifest |
| PROMPT-ASM-04 | ADMIN built prompt contains admin-only tools in the manifest |
| PROMPT-ASM-05 | APPRENTICE built prompt contains `search_my_conversations`, `generate_audio`, `generate_chart`, `get_section`, `get_checklist`, `list_practitioners`, and `set_preference` |
| PROMPT-ASM-06 | Identity section does not contain any raw tool names outside the manifest block |

### Verify

```bash
npx vitest run tests/system-prompt-assembly.test.ts
```

---

## Task 1.2 — Base prompt leak detection utility

**What:** Sprint 0 added assertions against a known list of removed tool names.
Sprint 1 generalizes that into a helper that scans the live registry names and
verifies none appear in `buildCorpusBasePrompt()`. This prevents future tool
additions from being accidentally hardcoded into the base prompt.

| Item | Detail |
| --- | --- |
| **Edit** | `src/lib/corpus-vocabulary.test.ts` |
| **Spec** | §3.4, §5 |

### Required behavior

```typescript
const toolNames = getToolRegistry().getToolNames();
for (const name of toolNames) {
  expect(basePrompt).not.toContain(`**${name}**`);
  expect(basePrompt).not.toContain(`\`${name}\``);
}
```

Do not fail on category-level descriptions such as "theme switching" or
"in-app navigation". The guard is against raw registry identifiers and the old
Anthropic-style bullet format.

### Verify

```bash
npx vitest run src/lib/corpus-vocabulary.test.ts
```

---

## Task 1.3 — Tool manifest formatting contract

**What:** The manifest is now dynamic, but its formatting is still an implicit
protocol. Add direct tests for how the section is rendered so prompt shape does
not drift accidentally.

| Item | Detail |
| --- | --- |
| **Edit** | `tests/tool-manifest-contract.test.ts` |
| **Spec** | §3.2 |

### Test scenarios

| Test ID | Scenario |
| --- | --- |
| FORMAT-01 | Manifest starts with a blank line followed by `TOOLS AVAILABLE TO YOU:` |
| FORMAT-02 | Each tool is rendered as `- **name**: description` |
| FORMAT-03 | Manifest ends with the instruction: `When the user asks what you can do...` |
| FORMAT-04 | Tools appear in registry order; no hidden sorting inside `withToolManifest()` |
| FORMAT-05 | Empty schema array does not inject a `tool_manifest` section |

### Why this matters

The extraction regexes in contract tests and downstream debugging workflows
assume a stable section shape. If the format changes silently, the contracts can
pass for the wrong reason or become brittle in ways that are hard to diagnose.

### Verify

```bash
npx vitest run tests/tool-manifest-contract.test.ts
```

---

## Task 1.4 — Role inventory parity helper

**What:** `tests/core-policy.test.ts` now contains explicit per-role arrays.
Sprint 1 extracts those expected sets into a shared helper so `core-policy` and
future prompt-assembly tests assert against one inventory source.

| Item | Detail |
| --- | --- |
| **Create** | `tests/helpers/role-tool-sets.ts` |
| **Edit** | `tests/core-policy.test.ts` |
| **Edit** | `tests/system-prompt-assembly.test.ts` |
| **Spec** | §4, §5 |

### Helper shape

```typescript
export const EXPECTED_ROLE_TOOL_SETS: Record<RoleName, string[]> = {
  ANONYMOUS: [...],
  AUTHENTICATED: [...],
  APPRENTICE: [...],
  STAFF: [...],
  ADMIN: [...],
};
```

### Verify

```bash
npx vitest run tests/core-policy.test.ts tests/system-prompt-assembly.test.ts
```

---

## Task 1.5 — Full verification pass

**What:** Run the full prompt-manifest verification suite and confirm the build
still succeeds. This sprint should end with both unit-level and integration-level
contracts proving that prompt content, prompt ordering, and RBAC stay aligned.

| Item | Detail |
| --- | --- |
| **Run** | `src/lib/corpus-vocabulary.test.ts` |
| **Run** | `tests/tool-manifest-contract.test.ts` |
| **Run** | `tests/system-prompt-assembly.test.ts` |
| **Run** | `tests/core-policy.test.ts` |
| **Run** | `npm run build` |
| **Spec** | §7, §8 |

### Verify

```bash
npx vitest run \
  src/lib/corpus-vocabulary.test.ts \
  tests/tool-manifest-contract.test.ts \
  tests/system-prompt-assembly.test.ts \
  tests/core-policy.test.ts

npm run build
```

---

## Done Criteria

- [ ] Full built prompt is contract-tested, not just isolated sections
- [ ] Base prompt cannot leak any live registry tool identifiers
- [ ] Manifest rendering format is explicitly locked down by tests
- [ ] Per-role expected tool sets live in one shared helper
- [ ] Verification suite and production build pass cleanly

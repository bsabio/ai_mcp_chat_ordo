# Spec 15: Debt Backlog Formalization

**Priority:** Medium
**Risk if deferred:** Known issues remain as informal notes and audit comments; no structured tracking means they get lost or repeated
**Files in scope:**
- Internal audit findings (referenced in letter.md)
- `docs/_refactor/` structure

---

## Problem Statement

The codebase's own internal audits have identified specific tech debt items:
- A 777-line schema function
- A dense stream route (addressed separately in Spec 10)
- A very large MCP librarian tool
- Many bare catch blocks (addressed in Spec 08)
- Backward-compatibility wrappers and dual-path code

These findings exist as informal comments, audit notes, or conversation artifacts. They are not tracked with acceptance criteria, are not prioritized, and have no defined "done" state. This means:
- The same issues get re-discovered and re-discussed.
- New contributors have no way to find or understand known debt.
- Cleanup effort is ad-hoc, not systematic.

---

## Architectural Approach

### Step 1: Create a formal debt registry

Create a single structured document that catalogs all known debt items:

```
docs/_refactor/system_debt_cleaning/15-debt-backlog-formalization/
  DEBT_REGISTRY.md
```

### Step 2: Define a standard debt entry format

Each debt item gets a consistent structure:

```markdown
### DEBT-001: 777-Line Schema Function

**Location:** [file path and function name]
**Severity:** Medium | High | Critical
**Category:** Complexity | Consistency | Security | Performance
**Discovered:** [date or audit reference]
**Status:** Open | In Progress | Resolved

**Description:**
[What the problem is, in 2-3 sentences.]

**Impact:**
[What breaks, degrades, or becomes harder because of this debt.]

**Acceptance Criteria for Resolution:**
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]

**Related Specs:** [Link to any spec that addresses this, e.g., "Spec 08", "Spec 10"]
```

### Step 3: Catalog all known debt items from the audit

Walk through the internal audit findings and the letter.md analysis. For each item NOT already covered by a spec in this system_debt_cleaning directory, create a DEBT entry:

| ID | Item | Already addressed by spec? |
|----|------|---------------------------|
| DEBT-001 | 777-line schema function | No — needs its own entry |
| DEBT-002 | Dense stream route | Yes — Spec 10 |
| DEBT-003 | Large MCP librarian tool | No — needs its own entry |
| DEBT-004 | Bare catch blocks | Yes — Spec 08 |
| DEBT-005 | Backward-compatibility wrappers | Partial — Spec 16 |
| DEBT-006 | Re-exports and deprecated patterns | Partial — Spec 16 |

### Step 4: Cross-reference with the spec system

Each debt entry that is addressed by a spec should link to it. Each spec should note which debt entries it resolves.

### Step 5: Establish the update protocol

Document how debt items are added and resolved:

```markdown
## Update Protocol

1. **Adding debt:** Any engineer or agent discovering tech debt adds an entry using the template above.
2. **Resolving debt:** When a spec or PR resolves a debt item, update the status to "Resolved" and link the PR.
3. **Review cadence:** Review the registry at the start of each sprint/iteration to identify items for cleanup.
4. **No stale items:** Items open for more than 3 months without activity should be re-evaluated (close or escalate).
```

---

## Constraints — Do NOT Introduce

- **Do not** build a tool or database for debt tracking. A markdown file is sufficient.
- **Do not** retroactively create specs for every debt item. Some items are small enough to fix directly; they just need to be tracked.
- **Do not** assign owners or due dates in this spec. That is a project management decision.
- **Do not** create a debt item for every `TODO` comment in the codebase. Focus on systemic issues identified by audits.
- **Do not** duplicate information already in the specs — reference the spec instead.

---

## Required Tests

### Structural Tests — `tests/debt-backlog-structure.test.ts`

| # | Test Name | Verifies |
|---|-----------|----------|
| 1 | `DEBT_REGISTRY.md exists` | Assert file exists at expected path. |
| 2 | `every debt entry has required fields` | Parse the markdown, extract entries by `### DEBT-` headers. Confirm each has Location, Severity, Category, Status, Description, and Acceptance Criteria sections. |
| 3 | `no duplicate DEBT IDs` | Extract all `DEBT-NNN` IDs, confirm uniqueness. |
| 4 | `resolved items reference a spec or PR` | For entries with `Status: Resolved`, confirm the "Related Specs" field is non-empty. |

---

## Acceptance Criteria

- [ ] `DEBT_REGISTRY.md` exists with all known audit findings cataloged.
- [ ] Each entry uses the standard format with severity, category, status, and acceptance criteria.
- [ ] Items already addressed by specs in this directory are cross-referenced.
- [ ] The update protocol is documented.
- [ ] The structural test passes.

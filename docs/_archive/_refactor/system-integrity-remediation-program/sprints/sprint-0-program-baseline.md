# Sprint 0 — Program Baseline

> **Goal:** Freeze the remediation scope and ensure every confirmed audit issue
> is covered by a named workstream with an explicit verification target.
> **Spec ref:** §1, §3, §6, §8
> **Prerequisite:** None

---

## Task 0.1 — Map findings to workstreams

**What:** Confirm each audit finding has one canonical home in the umbrella
program map and is covered by at least one issue-specific workstream spec.

### Verify Task 0.1

```bash
sed -n '1,220p' docs/_refactor/system-integrity-remediation-program/spec.md
sed -n '1,200p' docs/_refactor/README.md
```

Verification note:
The reviewer should explicitly check that each confirmed finding is named in
Section 1 or Section 3 of the umbrella spec and linked to one canonical
workstream, rather than relying on keyword grep alone.

---

## Task 0.2 — Freeze delivery order

**What:** Keep identity and ownership work ahead of summary hardening so later
prompt-safety work is built on stable user-resolution rules.

### Verify Task 0.2

```bash
sed -n '1,200p' docs/_refactor/README.md
sed -n '1,220p' docs/_refactor/system-integrity-remediation-program/spec.md
```

---

## Task 0.3 — Define final verification bar

**What:** Require focused tests plus a production build before the program is
considered complete.

### Verify Task 0.3

```bash
npx vitest run src/app/api/auth/auth-routes.test.ts src/proxy.test.ts src/app/api/conversations/active/route.test.ts src/hooks/useGlobalChat.test.tsx tests/chat-stream-route.test.ts src/core/use-cases/SummarizationInteractor.test.ts src/core/use-cases/tools/search-my-conversations.tool.test.ts src/lib/chat/embed-conversation.test.ts src/adapters/AnthropicSummarizer.test.ts
npm run repair:conversation-indexes
npm run build
```
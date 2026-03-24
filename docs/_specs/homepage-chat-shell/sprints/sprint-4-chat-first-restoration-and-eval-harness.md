# Sprint 4 - Chat-First Restoration And Eval Harness

> **Goal:** Restore the home route to a true chat-first surface by removing the route-level hero wrapper, migrating hero content and service chips into the embedded chat intro, and adding a reusable eval harness that can verify both hero and active-conversation homepage scenarios.
> **Spec ref:** `HCS-011` through `HCS-014`, `HCS-033` through `HCS-045`, `HCS-070` through `HCS-089`
> **Prerequisite:** Sprint 3 complete
> **Test count target:** Current homepage-shell suite + 2 eval scenarios + focused intro regressions

---

## Available Assets

| Asset | Verified Detail |
| --- | --- |
| `src/app/page.tsx` | The home route currently decides whether the homepage behaves like a direct chat surface or a wrapped hero-plus-chat composition |
| `src/frameworks/ui/ChatContainer.tsx` | The embedded chat container already owns the correct message/composer split and should remain the scroll contract owner |
| `src/frameworks/ui/MessageList.tsx` | Hero-state intro copy, chip behavior, and first-message composition already live here, making it the correct home for migrated hero content |
| `tests/homepage-shell-layout.test.tsx` and `tests/homepage-shell-ownership.test.tsx` | Existing homepage regression coverage already proves shell ownership and layout boundaries and can be extended instead of replaced |
| `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` | Manual browser evidence already exists and can now be paired with deterministic eval output |

---

## Task 4.1 - Remove the route-level hero wrapper and restore direct embedded chat

**What:** Make `/` render the embedded chat container directly again so the message viewport remains the first-class scroll owner.

| Item | Detail |
| --- | --- |
| **Modify** | `src/app/page.tsx` |
| **Delete** | `src/components/home/HomepageChatStage.tsx` if no longer used |
| **Modify** | `tests/homepage-shell-layout.test.tsx` |
| **Modify** | `tests/homepage-shell-ownership.test.tsx` |
| **Spec** | `HCS-011` through `HCS-014`, `HCS-033`, `HCS-042A`, `HCS-070`, `HCS-071`, `HCS-078` |

### Task 4.1 Positive Tests

1. The home route renders the embedded chat container directly inside `main`.
2. The footer remains outside the viewport stage and outside the embedded chat container.
3. The embedded chat keeps its separate message viewport and composer row contract.

### Task 4.1 Negative Tests

1. The home route no longer renders a separate `data-homepage-chat-stage` wrapper.
2. Restoring chat-first composition does not reintroduce a footer substitute or second route-level content rail.
3. The composer row does not become part of the scrollable message subtree.

### Task 4.1 Verify

```bash
npx vitest run tests/homepage-shell-layout.test.tsx tests/homepage-shell-ownership.test.tsx
```

---

## Task 4.2 - Migrate hero content and chips into the chat intro

**What:** Move the homepage hero content, service chips, and path framing into the embedded hero-state intro so the copy belongs to the chat surface rather than competing with it.

| Item | Detail |
| --- | --- |
| **Modify** | `src/frameworks/ui/MessageList.tsx` |
| **Modify** | `src/hooks/chat/chatState.ts` |
| **Modify** | `src/frameworks/ui/MessageList.test.tsx` |
| **Spec** | `HCS-033`, `HCS-053`, `HCS-082`, `HCS-083` |

### Task 4.2 Positive Tests

1. Hero state renders the migrated service chips and path cards inside the message viewport.
2. The intro content stays above the first assistant message and suggestion chips as one hero-state stack.
3. The hero message copy still invites both organizations and individuals into the chat.

### Task 4.2 Negative Tests

1. Non-hero conversation state does not keep rendering the homepage intro.
2. Migrating the intro does not displace the composer or create a second scroll surface.
3. The home route does not duplicate the hero content both above and inside the chat.

### Task 4.2 Verify

```bash
npx vitest run src/frameworks/ui/MessageList.test.tsx tests/homepage-shell-layout.test.tsx
```

---

## Task 4.3 - Add a reusable homepage eval harness

**What:** Create a scenario-based harness that evaluates the rendered homepage contract as a whole, not only through isolated assertions.

| Item | Detail |
| --- | --- |
| **Create** | `tests/helpers/homepageEvalHarness.ts` |
| **Create** | `tests/homepage-shell-evals.test.tsx` |
| **Modify** | `package.json` |
| **Spec** | `HCS-077` through `HCS-079`, `HCS-089` |

### Task 4.3 Notes

The harness should return a structured report per scenario with named checks. At minimum it must cover:

1. default hero-state homepage load
2. active conversation state after the user has started a thread

Each scenario should verify the same core contract so regressions are obvious when the route structure changes.

### Task 4.3 Positive Tests

1. The harness passes the default hero-state scenario.
2. The harness passes the active-conversation scenario.
3. The harness reports the checks for embedded chat ownership, footer separation, composer separation, and intro placement.

### Task 4.3 Negative Tests

1. The harness fails if a legacy route-level hero wrapper returns.
2. The harness fails if intro content appears in active conversation state.
3. The harness fails if footer or composer ownership drifts back into the chat surface incorrectly.

### Task 4.3 Verify

```bash
npm run test:homepage-evals
```

---

## Task 4.4 - Record the restored homepage contract in verification artifacts

**What:** Update homepage-shell verification docs so the repo records both deterministic eval coverage and remaining manual browser work.

| Item | Detail |
| --- | --- |
| **Modify** | `docs/_specs/homepage-chat-shell/artifacts/homepage-chat-shell-verification.md` |
| **Modify** | `docs/_specs/homepage-chat-shell/spec.md` |
| **Modify** | `docs/_specs/homepage-chat-shell/sprints/README.md` |
| **Spec** | `HCS-076` through `HCS-089` |

### Task 4.4 Positive Tests

1. The docs name the eval harness command and what it checks.
2. The docs preserve the distinction between deterministic eval coverage and manual Safari/mobile browser confirmation.

### Task 4.4 Negative Tests

1. Documentation does not imply that deterministic DOM evals replace Safari/mobile manual verification.
2. The restored chat-first contract is documented as architecture, not as temporary polish.

### Task 4.4 Verify

```bash
npx vitest run tests/homepage-shell-evals.test.tsx tests/homepage-shell-layout.test.tsx tests/homepage-shell-ownership.test.tsx src/frameworks/ui/MessageList.test.tsx
```

---

## Completion Checklist

- [ ] `/` renders embedded chat directly without a route-level hero wrapper
- [ ] Hero content and service chips live inside the message viewport intro
- [ ] Active conversation state hides the homepage intro
- [ ] `npm run test:homepage-evals` passes with structured scenario checks
- [ ] Homepage-shell docs record the restored contract and eval workflow
# Sprint 2B - Journal Worker Wrapper Registration

> Goal: turn the remaining journal-named worker targets into an explicit, sequenced implementation sprint grounded in the already-shipped editorial seams, current tool registry, and existing registry integration tests.

## Why This Sprint Exists

Sprint 2 shipped the admin editorial workspace, workflow mutations, revision restore support, and journal-first operator language across the current support surfaces.

The remaining gap is not the editorial domain model. The remaining gap is the registry layer.

`src/lib/chat/tool-composition-root.ts` still registers compatibility-safe blog-named tools such as `draft_content`, `publish_content`, `compose_blog_article`, and `produce_blog_article`.

This sprint converts the remaining journal-named worker targets from a broad future-state artifact into a concrete registration sprint with explicit verification requirements.

## Grounding In Current Code

This sprint must build on the current implementation rather than recreate it.

Existing seams already available:

1. `src/lib/journal/admin-journal-actions.ts` provides the deterministic admin mutation bridge for metadata edits, draft-body edits, workflow transitions, and revision restore inputs.
2. `JournalEditorialInteractor` already enforces the canonical editorial policy boundary used by the admin detail workspace.
3. `src/lib/chat/tool-composition-root.ts` is the canonical registry composition root and remains the only valid place to wire new worker registrations.
4. `tests/tool-registry.integration.test.ts` already provides a strong registry-level verification seam for role exposure, duplicate registration, RBAC denial, and unknown-tool handling.

This sprint should introduce journal-named wrappers over those shipped seams and keep compatibility-safe behavior explicit where public IDs must remain stable.

## Scope

### Task 2B.1 - Journal Query Worker Wrappers

Add journal-named query workers that expose the editorial inventory through deterministic interactor boundaries.

Target worker set:

1. `list_journal_posts`
2. `get_journal_post`
3. `list_journal_revisions`
4. `get_journal_workflow_summary`

Implementation expectations:

1. query workers should delegate to explicit interactor boundaries rather than page-only read logic
2. worker outputs should reflect the same journal-first operator language already established in Sprint 2
3. registration should occur through `src/lib/chat/tool-composition-root.ts`

### Task 2B.2 - Journal Mutation Worker Wrappers

Add deterministic journal-named mutation workers over the existing editorial seams.

Target worker set:

1. `update_journal_metadata`
2. `update_journal_draft`
3. `submit_journal_review`
4. `approve_journal_post`
5. `publish_journal_post`
6. `restore_journal_revision`
7. `select_journal_hero_image`
8. `prepare_journal_post_for_publish`

Implementation expectations:

1. mutation workers should reuse the shipped editorial repositories and interactor boundaries rather than duplicate policy logic in tool factories
2. worker registration should preserve existing compatibility-safe blog-named tools until the public rename plan explicitly authorizes removal
3. mutation workers must remain deterministic and fail closed on unsupported transitions or invalid identifiers

### Task 2B.3 - Registry Truthfulness And Spec Alignment

Make the registry and spec package describe the same reality.

Required follow-through:

1. update `tests/tool-registry.integration.test.ts` to assert the newly registered journal worker set and its role exposure
2. update `tests/tool-registry.test.ts` if lower-level registry expectations change
3. keep `docs/_specs/journal-editorial-operations/artifacts/journal-worker-implementation-map.md` aligned with the final registered worker set
4. keep compatibility-safe blog-named registrations explicit until a later sprint removes or aliases them intentionally

## Positive, Negative, And Edge Case Coverage

This sprint is not complete unless worker registration is covered at the registry, contract, and policy boundary levels.

### Positive

1. registry composition exposes the new journal query and mutation workers to the correct admin-capable roles
2. journal query workers return editorial inventory and revision data through explicit interactors rather than page-only helpers
3. journal mutation workers delegate to the same shipped editorial seams already exercised by the admin workspace
4. compatibility-safe blog-named tools remain available where current runtime behavior still depends on them

### Negative

1. non-admin or otherwise unauthorized roles do not gain access to privileged journal mutation workers
2. duplicate registration names fail closed through the existing registry protections
3. invalid identifiers, unsupported workflow targets, and missing revisions fail without mutating post state
4. introducing journal-named wrappers does not silently remove or rename compatibility-safe tool IDs still used elsewhere in the runtime

### Edge

1. registry tests cover coexistence of journal-named wrappers and legacy blog-named registrations during the transition period
2. at Sprint 2B time, wrapper workers remained truthful about published-route behavior while public content still resolved through `/blog/[slug]` ahead of Sprint 3
3. workflow summary workers handle empty queues, zero matching posts, and no active jobs without throwing or widening scope incorrectly
4. restore and publish wrappers continue to align with revision-safety requirements instead of bypassing snapshot creation under rare paths

## Planned Tests

At minimum, this sprint should create or extend the following tests:

1. `src/core/use-cases/tools/journal-query.tool.test.ts`
2. `src/core/use-cases/tools/journal-write.tool.test.ts`
3. `tests/tool-registry.integration.test.ts`
4. `tests/tool-registry.test.ts` if registry-unit expectations change

## Focused Verification

```bash
npm exec vitest run src/core/use-cases/tools/journal-query.tool.test.ts src/core/use-cases/tools/journal-write.tool.test.ts tests/tool-registry.integration.test.ts tests/tool-registry.test.ts src/lib/journal/admin-journal-actions.test.ts
```

## Exit Criteria

This sprint is complete when:

1. the remaining journal-named worker targets are implemented as explicit wrappers or intentionally descoped with a documented reason
2. `src/lib/chat/tool-composition-root.ts` registers the supported journal worker set truthfully
3. registry integration tests prove role exposure, duplicate protection, and denial behavior for the new wrappers
4. the worker implementation map and testing matrix describe the shipped registry state rather than a vague future target
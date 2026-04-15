# Sprint 10 — Capability Catalog Expansion

> **Status:** Complete
> **Goal:** Expand the capability catalog from 4 pilot tools to cover all 55
> tools in the system, making the catalog the authoritative source of truth
> for tool metadata across the entire application.
> **Prerequisite:** Sprint 9 complete ✅
> **Estimated scope:** 51 new catalog entries, ~8 new tests

## QA Findings Before Implementation

1. **Tool count is 55, not ~37.** The deep dive undercounted because it
   missed the 20 blog/journal tools (11 journal workflow + 9 content/production)
   and miscounted some navigation/profile tools.
2. The doc listed `navigate` as a tool — it's NOT registered; only
   `navigate_to_page` is. Corrected.
3. Blog tools are 20 total, not 3. This is the largest single bundle.
4. `admin_search` is registered in the **navigation** bundle, not admin.
5. `get_my_job_status` and `list_my_jobs` are in the **profile** bundle, not job.

## Current State

### Tools already in catalog (4)
- `draft_content`, `publish_content`, `compose_media`, `admin_web_search`

### Tools not yet in catalog (51), by bundle

**admin-tools (3 remaining):**
- `admin_prioritize_leads`, `admin_prioritize_offer`, `admin_triage_routing_risk`

**affiliate-tools (4):**
- `get_my_affiliate_summary`, `list_my_referral_activity`
- `get_admin_affiliate_summary`, `list_admin_referral_exceptions`

**blog-tools — journal workflow (11):**
- `list_journal_posts`, `get_journal_post`, `list_journal_revisions`
- `get_journal_workflow_summary`, `update_journal_metadata`, `update_journal_draft`
- `submit_journal_review`, `approve_journal_post`, `publish_journal_post`
- `restore_journal_revision`, `select_journal_hero_image`

**blog-tools — content/production (7 new; `draft_content` + `publish_content` already cataloged):**
- `generate_blog_image`, `compose_blog_article`, `qa_blog_article`
- `resolve_blog_article_qa`, `generate_blog_image_prompt`, `produce_blog_article`
- `prepare_journal_post_for_publish`

**calculator-tools (4):**
- `calculator`, `generate_chart`, `generate_graph`, `generate_audio`

**conversation-tools (1):**
- `search_my_conversations`

**corpus-tools (5):**
- `search_corpus`, `get_section`, `get_corpus_summary`
- `get_checklist`, `list_practitioners`

**job-tools (2):**
- `get_deferred_job_status`, `list_deferred_jobs`

**media-tools (0, already in catalog):**
- (compose_media already in catalog)

**navigation-tools (5):**
- `get_current_page`, `inspect_runtime_context`, `list_available_pages`
- `navigate_to_page`, `admin_search`

**profile-tools (5):**
- `get_my_profile`, `update_my_profile`, `get_my_referral_qr`
- `get_my_job_status`, `list_my_jobs`

**theme-tools (4):**
- `set_theme`, `inspect_theme`, `adjust_ui`, `set_preference`

### Catalog facets per tool

Every entry MUST have `core` and `runtime` facets. The remaining facets
are optional per tool:

| Facet | Required | Source |
| --- | --- | --- |
| `core` | Yes | ToolDescriptor name/description + RoleName from bundle RBAC |
| `runtime` | Yes | ToolDescriptor executionMode + DeferredExecutionConfig |
| `presentation` | Only if CapabilityPresentationDescriptor exists | CapabilityPresentationRegistry |
| `job` | Only if tool has deferred-job handler | JobCapabilityRegistry |
| `browser` | Only if tool has browser-side runtime | BrowserCapabilityRegistry |
| `promptHint` | Only if tool injects role directives | ROLE_DIRECTIVES |
| `mcpExport` | Only if tool is exported via MCP | MCP server config |

### What Sprint 5 proved

- Catalog shape works for `core`, `runtime`, `presentation`, `job`, and `browser`
- `registry-sync.test.ts` validates CapabilityPresentationDescriptor ↔ catalog
- MCP export projection works for catalog entries with `mcpExport` facet

## Tasks

1. **Define catalog entries for all 51 remaining tools**
   - Start with simple tools (calculator, theme, navigation) to establish rhythm
   - Then admin, corpus, profile, conversation tools
   - End with blog tools (largest at 18 entries)
   - Each entry must have `core` and `runtime` facets at minimum

2. **Extract runtime facets from existing ToolDescriptors**
   - For each tool, read its `executionMode` and `deferred` config
   - Cross-reference with CapabilityPresentationRegistry for `presentation`
   - Cross-reference with JobCapabilityRegistry for `job` facet
   - Cross-reference with BrowserCapabilityRegistry for `browser` facet

3. **Organize catalog by category**
   - Keep within a single `catalog.ts` file with clear section headers
   - If file exceeds 800 lines, split into per-bundle catalog fragment files
     that are merged into the main export

4. **Add catalog-total-coverage test**
   - New test: every registered tool name exists in the catalog
   - New test: every catalog entry has a matching ToolDescriptor
   - New test: catalog `core.roles` matches bundle RBAC policy

5. **Extend registry-sync tests for new entries**
   - Extend `registry-sync.test.ts` to validate parity for all 55 tools

## Out of Scope

- Replacing ToolDescriptor factories with catalog-driven construction (Sprint 12)
- Deriving bundle membership from catalog (Sprint 12)
- Prompt directive derivation from catalog (Sprint 13)
- MCP export intent for non-pilot tools (Sprint 11)

## Acceptance Criteria

1. `CAPABILITY_CATALOG` contains entries for all 55 tools registered via bundles.
2. `registry-sync.test.ts` validates parity for every catalog entry.
3. A coverage test proves no tool exists in the registry without a catalog entry.
4. `npm run qa:unification` remains green with expanded test count.
5. Zero new type errors introduced.

## Verification

- `npm run qa:unification` passes with new coverage tests
- `tsc --noEmit` has zero errors in changed files
- `Object.keys(CAPABILITY_CATALOG).length === 55`

## QA Closeout

### Acceptance Criteria Results

| # | Criterion | Result |
| --- | --- | --- |
| 1 | CAPABILITY_CATALOG contains entries for all 55 tools | ✅ 55 entries, verified by key count |
| 2 | registry-sync.test.ts validates parity | ✅ 6 tests pass |
| 3 | Coverage test proves no tool exists without catalog entry | ✅ 5 new tests pass |
| 4 | qa:unification green with expanded test count | ✅ 116 tests, 10 files |
| 5 | Zero new type errors | ✅ |

### Files Changed

| File | Change |
| --- | --- |
| `catalog.ts` | Expanded from 4 to 55 entries (+1095 lines) |
| `catalog.test.ts` | Updated integrity tests for 55 entries |
| `catalog-coverage.test.ts` | NEW — 5 coverage assertions |
| `run-unification-qa.ts` | Added Sprint 10 test file |

### Metrics

| Metric | Before | After |
| --- | --- | --- |
| Catalog entries | 4 | 55 |
| qa:unification tests | 111 | 116 |
| qa:unification test files | 9 | 10 |

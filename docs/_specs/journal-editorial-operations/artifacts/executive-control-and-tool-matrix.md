# Executive Control And Tool Matrix

This artifact defines how the journal system should behave when the human owner uses chat as the executive control surface.

## Control-Surface Model

The owner should not need to think in tool names, workflow enums, or admin-page choreography.

The primary interaction model is:

1. **Ask** — get status, explain blockers, inspect readiness
2. **Delegate** — assign drafting, review, preparation, or generation work
3. **Approve** — authorize publication, restoration, or final selection

Admin pages remain support surfaces for:

1. inspection
2. auditability
3. precise correction
4. fallback control when chat needs a human-visible workspace

## Chat-Native Executive Workflows

| Owner intent | Example prompt | System behavior |
| --- | --- | --- |
| Ask | "What journal work is blocked right now?" | Query drafts, reviews, revisions, and jobs; return concise operator summary with next actions |
| Ask | "Which draft is closest to publishable?" | Inspect current journal inventory and summarize readiness rather than dumping raw rows |
| Delegate | "Draft a journal briefing from these release notes." | Queue or run composition workers, persist artifacts, and report progress/results |
| Delegate | "Prepare the governance piece for publication." | Inspect the draft, run QA or remediation if needed, check metadata/readiness, and report what still needs approval |
| Delegate | "Generate hero image options for the latest essay." | Reuse image-prompt and image-generation workers with deferred progress if heavy |
| Approve | "Publish the approved briefing." | Validate readiness, request confirmation if needed, then perform the publish transition |
| Approve | "Use option 2 as the hero image." | Execute deterministic selection worker and report the updated state |
| Approve | "Restore the previous revision of this draft." | Show or identify the relevant revision, confirm if destructive, then perform restore with audit trail |

## Worker Families

The LLM should delegate to discrete workers rather than one monolithic journal-management tool.

### 1. Read / Reporting Workers

| Worker | Purpose | LLM-assisted | Execution mode |
| --- | --- | --- | --- |
| `list_journal_posts` | Return admin inventory by state, section, or search | No | Inline |
| `get_journal_post` | Inspect one post with workflow and metadata context | No | Inline |
| `list_journal_revisions` | Inspect revision history | No | Inline |
| `get_journal_workflow_summary` | Summarize what is blocked, ready, or waiting | Possibly formatting only | Inline |
| `get_my_job_status` / `list_my_jobs` | Reuse existing deferred-job status visibility | No | Inline |

### 2. Deterministic Mutation Workers

| Worker | Purpose | LLM-assisted | Execution mode |
| --- | --- | --- | --- |
| `update_journal_metadata` | Update title, description, standfirst, section, slug policy-bound | No | Inline |
| `update_journal_draft` | Update body copy or structured draft fields | No | Inline |
| `submit_journal_review` | Move draft into review state | No | Inline |
| `approve_journal_post` | Move review item into approved state | No | Inline |
| `publish_journal_post` | Publish an approved item | No, except summary | Inline unless publish grows side effects |
| `restore_journal_revision` | Restore a saved revision with audit trail | No | Inline |
| `select_journal_hero_image` | Choose the canonical hero image | No | Inline |

### 3. LLM-Assisted Editorial Workers

| Worker | Purpose | LLM-assisted | Execution mode |
| --- | --- | --- | --- |
| `suggest_journal_metadata` | Propose title, description, standfirst, or section | Yes | Inline or deferred depending on provider cost |
| `compose_journal_article` | Draft structured article content from a brief | Yes | Deferred |
| `qa_journal_article` | Run editorial QA and return findings | Yes | Deferred |
| `resolve_journal_article_qa` | Revise article content against QA findings | Yes | Deferred |
| `generate_journal_image_prompt` | Produce hero-image prompt and alt text | Yes | Deferred |

### 4. Orchestration Workers

| Worker | Purpose | LLM-assisted | Execution mode |
| --- | --- | --- | --- |
| `produce_journal_article` | Compose, QA, resolve, design image prompt, generate hero image, persist artifacts | Yes | Deferred |
| `prepare_journal_post_for_publish` | Inspect a draft, run missing checks, and report readiness or blockers | Mixed | Usually deferred if multi-stage |

## Existing-System Reuse Map

| Existing system capability | How this package should leverage it |
| --- | --- |
| `draft_content` / `publish_content` | Keep as compatibility-safe low-level workers while journal-first wrappers or descriptions evolve |
| `compose_blog_article`, `qa_blog_article`, `resolve_blog_article_qa`, `generate_blog_image_prompt`, `produce_blog_article` | Treat as the existing staged editorial workforce; prefer wrappers or journal-first descriptions over parallel reimplementation |
| Existing tool registry and descriptor model | Keep using typed `ToolDescriptor` registration with explicit inline/deferred execution choice |
| Existing deferred-job system | Use for heavy multi-stage editorial work rather than building journal-specific background execution |
| Existing job-status tools | Reuse as the operator status surface rather than inventing journal-only job inspection |
| Existing ICA/action-link and operator-brief patterns | Use for concise executive summaries, next actions, and approval affordances |

## Approval Boundaries

The LLM should operate autonomously within bounded editorial workflows but should stop for explicit approval when:

1. publishing live content
2. restoring revisions that replace current draft state
3. changing the canonical selected hero image for a live post if policy requires confirmation
4. changing live route truth or canonical URL behavior

## Progress And Reporting Rules

When a delegated action is deferred, progress should be reported in human-readable stages rather than raw infrastructure terms.

Good examples:

1. `Draft queued`
2. `Editorial QA running`
3. `Resolving findings`
4. `Generating hero image options`
5. `Ready for approval`

Avoid forcing the owner to ask low-level questions such as job IDs or internal worker names unless they explicitly want that detail.
import type { CapabilityDefinition } from "../capability-definition";
import { CATALOG_INPUT_SCHEMAS } from "../catalog-input-schemas";
import type { JobProgressPhaseDefinition } from "@/lib/jobs/job-capability-types";
import {
  ADMIN_ROLES,
  AUTOMATIC_RETRY_EDITORIAL,
  MANUAL_ONLY_RETRY,
} from "./shared";

const PRODUCE_BLOG_ARTICLE_PROGRESS_PHASES = [
  { key: "compose_blog_article", label: "Composing article", baselinePercent: 10 },
  { key: "qa_blog_article", label: "Reviewing article", baselinePercent: 30 },
  { key: "resolve_blog_article_qa", label: "Resolving QA findings", baselinePercent: 50 },
  { key: "generate_blog_image_prompt", label: "Designing hero image prompt", baselinePercent: 65 },
  { key: "generate_blog_image", label: "Generating hero image", baselinePercent: 80 },
  { key: "draft_content", label: "Saving draft", baselinePercent: 95 },
] as const satisfies readonly JobProgressPhaseDefinition[];

export const BLOG_PILOT_CAPABILITIES = {
  draft_content: {
    core: {
      name: "draft_content",
      label: "Draft Content",
      description:
        "Draft a journal article as structured markdown. Use markdown headings, lists, links, quotes, tables, or fenced code blocks as appropriate. Do not repeat the title inside the content body. The article is saved as a draft that must be explicitly published by an admin.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Journal article title" },
          content: {
            type: "string",
            description: "Journal article body in structured markdown format with headings and other markdown elements, excluding the page title",
          },
        },
        required: ["title", "content"],
      },
      outputHint: "Returns draft post ID and confirmation",
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "draft_content",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "draft_content",
      mode: "parse",
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
    },
    job: {
      family: "editorial",
      label: "Draft Content",
      description:
        "Draft a structured journal article and persist the draft for editorial review.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: AUTOMATIC_RETRY_EDITORIAL,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "open_artifact" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
  },

  publish_content: {
    core: {
      name: "publish_content",
      label: "Publish Content",
      description:
        "Publish a draft journal article, making it publicly visible in the journal. Accepts either the post ID or the article slug.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: {
        type: "object",
        properties: {
          post_id: {
            type: "string",
            description: "The ID of the draft journal article to publish.",
          },
          slug: {
            type: "string",
            description: "The slug of the draft journal article to publish (alternative to post_id).",
          },
        },
      },
      outputHint: "Returns published post URL and status",
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "publish_content",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "publish_content",
      mode: "parse",
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
    },
    job: {
      family: "editorial",
      label: "Publish Content",
      description:
        "Publish an editorial draft and align any linked hero assets for public visibility.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: AUTOMATIC_RETRY_EDITORIAL,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "open_artifact" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;

export const BLOG_JOURNAL_CAPABILITIES = {
  list_journal_posts: {
    core: {
      name: "list_journal_posts",
      label: "List Journal Posts",
      description:
        "List journal posts with optional status and category filters.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.list_journal_posts,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "list_journal_posts",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "list_journal_posts",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `list_journal_posts` or `get_journal_post` for inventory and one-post inspection.",
        ],
      },
    },
  },

  get_journal_post: {
    core: {
      name: "get_journal_post",
      label: "Get Journal Post",
      description:
        "Retrieve a specific journal post by ID with full content and metadata.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.get_journal_post,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "get_journal_post",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "get_journal_post",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `list_journal_posts` or `get_journal_post` for inventory and one-post inspection.",
        ],
      },
    },
  },

  list_journal_revisions: {
    core: {
      name: "list_journal_revisions",
      label: "List Journal Revisions",
      description:
        "List all editorial revisions for a specific journal post.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.list_journal_revisions,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "list_journal_revisions",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "list_journal_revisions",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
  },

  get_journal_workflow_summary: {
    core: {
      name: "get_journal_workflow_summary",
      label: "Get Journal Workflow Summary",
      description:
        "Get a summary of the editorial workflow state for a journal post including active jobs and blockers.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.get_journal_workflow_summary,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "get_journal_workflow_summary",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "get_journal_workflow_summary",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- For journal inventory, blocker, or moderation questions, prefer the journal wrapper tools over compatibility-safe blog tool names. Use `get_journal_workflow_summary` for blocked, in-review, and ready-to-publish reads; use `list_journal_posts` or `get_journal_post` for inventory and one-post inspection.",
        ],
      },
    },
  },

  update_journal_metadata: {
    core: {
      name: "update_journal_metadata",
      label: "Update Journal Metadata",
      description:
        "Update journal post metadata fields such as title, description, tags, and category.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.update_journal_metadata,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "update_journal_metadata",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "update_journal_metadata",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `update_journal_metadata` for title, description, tags, and category changes.",
        ],
      },
    },
  },

  update_journal_draft: {
    core: {
      name: "update_journal_draft",
      label: "Update Journal Draft",
      description:
        "Replace the content body of a journal post draft.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.update_journal_draft,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "update_journal_draft",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "update_journal_draft",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `update_journal_draft` for content body replacements.",
        ],
      },
    },
  },

  submit_journal_review: {
    core: {
      name: "submit_journal_review",
      label: "Submit Journal Review",
      description:
        "Submit an editorial review for a journal post with approval or change-request decision.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.submit_journal_review,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "submit_journal_review",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "submit_journal_review",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `submit_journal_review` for editorial review decisions.",
        ],
      },
    },
  },

  approve_journal_post: {
    core: {
      name: "approve_journal_post",
      label: "Approve Journal Post",
      description:
        "Approve a journal post for publication after editorial review.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.approve_journal_post,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "approve_journal_post",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "approve_journal_post",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `approve_journal_post` for editorial approval decisions.",
        ],
      },
    },
  },

  publish_journal_post: {
    core: {
      name: "publish_journal_post",
      label: "Publish Journal Post",
      description:
        "Publish an approved journal post, making it publicly visible.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.publish_journal_post,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "publish_journal_post",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "publish_journal_post",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `publish_journal_post` only when the admin has clearly approved publication.",
        ],
      },
    },
  },

  restore_journal_revision: {
    core: {
      name: "restore_journal_revision",
      label: "Restore Journal Revision",
      description:
        "Restore a previous editorial revision as the active draft content.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.restore_journal_revision,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "restore_journal_revision",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "restore_journal_revision",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `update_journal_metadata`, `update_journal_draft`, `submit_journal_review`, `approve_journal_post`, and `restore_journal_revision` for deterministic editorial changes. Use `publish_journal_post` only when the admin has clearly approved publication.",
        ],
      },
    },
  },

  select_journal_hero_image: {
    core: {
      name: "select_journal_hero_image",
      label: "Select Journal Hero Image",
      description:
        "Select or change the hero image for a journal post from available generated assets.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.select_journal_hero_image,
    },
    runtime: {},
    executorBinding: {
      bundleId: "blog",
      executorId: "select_journal_hero_image",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "select_journal_hero_image",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "inline",
      artifactKinds: ["image"],
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- Use `select_journal_hero_image` when the admin wants to make a specific image canonical for a journal article.",
        ],
      },
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;

export const BLOG_PRODUCTION_CAPABILITIES = {
  generate_blog_image: {
    core: {
      name: "generate_blog_image",
      label: "Generate Blog Image",
      description:
        "Generate the editorial hero image asset for a prepared article.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.generate_blog_image,
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "generate_blog_image",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "generate_blog_image",
      mode: "parse",
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
      artifactKinds: ["image"],
    },
    job: {
      family: "editorial",
      label: "Generate Blog Image",
      description:
        "Generate the editorial hero image asset for a prepared article.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: AUTOMATIC_RETRY_EDITORIAL,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "retain" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
  },

  compose_blog_article: {
    core: {
      name: "compose_blog_article",
      label: "Compose Blog Article",
      description:
        "Compose the first editorial article draft from a brief.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.compose_blog_article,
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "compose_blog_article",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "compose_blog_article",
      mode: "parse",
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
    },
    job: {
      family: "editorial",
      label: "Compose Blog Article",
      description:
        "Compose the first editorial article draft from a brief.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: AUTOMATIC_RETRY_EDITORIAL,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "retain" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
  },

  qa_blog_article: {
    core: {
      name: "qa_blog_article",
      label: "QA Blog Article",
      description:
        "Run editorial QA against the current article draft and return structured findings.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.qa_blog_article,
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "qa_blog_article",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "qa_blog_article",
      mode: "parse",
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
    },
    job: {
      family: "editorial",
      label: "QA Blog Article",
      description:
        "Run editorial QA against the current article draft and return structured findings.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: MANUAL_ONLY_RETRY,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "retain" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
  },

  resolve_blog_article_qa: {
    core: {
      name: "resolve_blog_article_qa",
      label: "Resolve Blog Article QA",
      description:
        "Apply editorial fixes from a normalized QA report to the current article draft.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.resolve_blog_article_qa,
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "resolve_blog_article_qa",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "resolve_blog_article_qa",
      mode: "parse",
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
    },
    job: {
      family: "editorial",
      label: "Resolve Blog Article QA",
      description:
        "Apply editorial fixes from a normalized QA report to the current article draft.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: MANUAL_ONLY_RETRY,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "open_artifact" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
  },

  generate_blog_image_prompt: {
    core: {
      name: "generate_blog_image_prompt",
      label: "Generate Blog Image Prompt",
      description:
        "Design the editorial hero-image prompt and related metadata for a finished article.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.generate_blog_image_prompt,
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "generate_blog_image_prompt",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "generate_blog_image_prompt",
      mode: "parse",
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
    },
    job: {
      family: "editorial",
      label: "Generate Blog Image Prompt",
      description:
        "Design the editorial hero-image prompt and related metadata for a finished article.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: MANUAL_ONLY_RETRY,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "retain" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
  },

  produce_blog_article: {
    core: {
      name: "produce_blog_article",
      label: "Produce Blog Article",
      description:
        "Run the full editorial production pipeline from composition through draft persistence.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.produce_blog_article,
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "produce_blog_article",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "produce_blog_article",
      mode: "parse",
    },
    presentation: {
      family: "editorial",
      cardKind: "editorial_workflow",
      executionMode: "deferred",
      progressMode: "phased",
      artifactKinds: ["image"],
    },
    job: {
      family: "editorial",
      label: "Produce Blog Article",
      description:
        "Run the full editorial production pipeline from composition through draft persistence.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: MANUAL_ONLY_RETRY,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "open_artifact" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
      progressPhases: PRODUCE_BLOG_ARTICLE_PROGRESS_PHASES,
    },
  },

  prepare_journal_post_for_publish: {
    core: {
      name: "prepare_journal_post_for_publish",
      label: "Prepare Journal Post for Publish",
      description:
        "Check whether a journal post is ready to publish and summarize blockers, active work, and QA findings.",
      category: "content",
      roles: ["ADMIN"],
    },
    schema: {
      inputSchema: CATALOG_INPUT_SCHEMAS.prepare_journal_post_for_publish,
    },
    runtime: {
      executionMode: "deferred",
      deferred: {
        dedupeStrategy: "per-conversation-payload",
        retryable: true,
        notificationPolicy: "completion-and-failure",
      },
    },
    executorBinding: {
      bundleId: "blog",
      executorId: "prepare_journal_post_for_publish",
      executionSurface: "internal",
    },
    validationBinding: {
      validatorId: "prepare_journal_post_for_publish",
      mode: "parse",
    },
    presentation: {
      family: "journal",
      cardKind: "journal_workflow",
      executionMode: "deferred",
    },
    job: {
      family: "editorial",
      label: "Journal Publish Readiness",
      description:
        "Check whether a journal post is ready to publish and summarize blockers, active work, and QA findings.",
      executionPrincipal: "system_worker",
      executionAllowedRoles: ADMIN_ROLES,
      retryPolicy: AUTOMATIC_RETRY_EDITORIAL,
      recoveryMode: "rerun",
      resultRetention: "retain",
      artifactPolicy: { mode: "retain" },
      initiatorRoles: ADMIN_ROLES,
      ownerViewerRoles: ADMIN_ROLES,
      ownerActionRoles: ADMIN_ROLES,
      globalViewerRoles: ADMIN_ROLES,
      globalActionRoles: ADMIN_ROLES,
      defaultSurface: "global",
    },
    promptHint: {
      roleDirectiveLines: {
        ADMIN: [
          "- When the admin asks if something is ready to publish, use `prepare_journal_post_for_publish` before recommending a publish action so you can report blockers, active work, revision state, and any requested QA findings in one operator summary.",
        ],
      },
    },
  },
} as const satisfies Record<string, CapabilityDefinition>;
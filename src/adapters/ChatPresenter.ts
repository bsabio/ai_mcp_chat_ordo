import type { ChatMessage, FailedSendMetadata } from "../core/entities/chat-message";
import type { InlineNode, RichContent } from "../core/entities/rich-content";
import type { UICommand } from "../core/entities/ui-command";
import { UI_COMMAND_TYPE } from "../core/entities/ui-command";
import { BLOCK_TYPES, VALID_ACTION_TYPES } from "../core/entities/rich-content";
import type { ActionLinkType } from "../core/entities/rich-content";
import { getPresentedAttachments, type PresentedAttachment } from "@/lib/chat/message-attachments";
import type { MarkdownParserService } from "./MarkdownParserService";
import type { CommandParserService } from "./CommandParserService";
import { resolveGenerateChartPayload } from "@/core/use-cases/tools/chart-payload";
import { resolveGenerateGraphPayload, type ResolvedGraphPayload } from "@/core/use-cases/tools/graph-payload";
import type {
  GenerationStatusMessagePart,
  JobStatusMessagePart,
  MessagePart,
} from "@/core/entities/message-parts";
import { extractJobStatusSnapshots } from "@/lib/jobs/job-status-snapshots";
import { getAdminJournalPreviewPath } from "@/lib/journal/admin-journal-routes";
import { getSupportedTheme, isSupportedTheme } from "@/lib/theme/theme-manifest";
import { DEFAULT_PROMPTS } from "@/lib/config/defaults";

const SUGGESTIONS_MARKER = "__suggestions__:";
const ACTIONS_MARKER = "__actions__:";

const TOOL_NAMES = {
  SET_THEME: "set_theme",
  NAVIGATE: "navigate",
  NAVIGATE_TO_PAGE: "navigate_to_page",
  ADJUST_UI: "adjust_ui",
  INSPECT_THEME: "inspect_theme",
  GENERATE_CHART: "generate_chart",
  GENERATE_GRAPH: "generate_graph",
  GENERATE_AUDIO: "generate_audio",
  ADMIN_WEB_SEARCH: "admin_web_search",
  GET_MY_PROFILE: "get_my_profile",
  UPDATE_MY_PROFILE: "update_my_profile",
  GET_MY_REFERRAL_QR: "get_my_referral_qr",
  GET_JOURNAL_WORKFLOW_SUMMARY: "get_journal_workflow_summary",
  PREPARE_JOURNAL_POST_FOR_PUBLISH: "prepare_journal_post_for_publish",
} as const;

type ProfileResultPayload = {
  action: "get_my_profile" | "update_my_profile";
  message?: string;
  profile: {
    name: string;
    email: string;
    credential?: string | null;
    affiliate_enabled: boolean;
    referral_code?: string | null;
    referral_url?: string | null;
    qr_code_url?: string | null;
    roles?: string[];
  };
};

type ReferralQrResultPayload =
  | {
      action: "get_my_referral_qr";
      message?: string;
      referral_code: string;
      referral_url: string;
      qr_code_url: string;
      manage_route?: string;
    }
  | {
      action: "get_my_referral_qr";
      error: string;
      affiliate_enabled?: boolean;
      manage_route?: string;
    };

type JournalWorkflowSummaryPayload = {
  action: "get_journal_workflow_summary";
  summary: string;
  counts: {
    draft: number;
    review: number;
    approved: number;
    blocked: number;
    ready_to_publish: number;
    active_jobs: number;
  };
  blocked_posts?: Array<{
    title: string;
    detail_route: string;
    blockers: string[];
  }>;
  ready_to_publish_posts?: Array<{
    title: string;
    detail_route: string;
    preview_route: string;
  }>;
};

type PrepareJournalPostForPublishPayload = {
  action: "prepare_journal_post_for_publish";
  ready: boolean;
  summary: string;
  blockers: string[];
  revision_count: number;
  post: {
    id: string;
    title: string;
    detail_route: string;
    preview_route: string;
  };
};

type InspectThemeResultPayload = {
  action: "inspect_theme";
  message: string;
  supported_theme_ids: readonly string[];
  ordered_theme_profiles: ReadonlyArray<{
    id: string;
    name: string;
    description: string;
    yearRange: string;
    primaryAttributes: readonly string[];
    motionIntent: string;
    shadowIntent: string;
    densityDefaults: {
      standard: string;
      dataDense: string;
      touch: string;
    };
    approvedControlAxes: readonly string[];
  }>;
  approved_control_axes: ReadonlyArray<{
    id: string;
    label: string;
    options: readonly unknown[];
    defaultValue: unknown;
    mutationTools: readonly string[];
  }>;
  active_theme_state: {
    available: boolean;
    reason: string;
  };
};

type NavigateToPageResultPayload = {
  path: string;
  label: string | null;
  description: string | null;
  __actions__: Array<{ type: "navigate"; path: string }>;
};

type GenerateAudioResultPayload = {
  action: "generate_audio";
  title: string;
  text: string;
  assetId: string | null;
  provider: string;
  generationStatus: "client_fetch_pending" | "cached_asset";
  estimatedDurationSeconds: number;
  estimatedGenerationSeconds: number;
};

export interface MessageAction {
  label: string;
  action: ActionLinkType;
  params: Record<string, string>;
}

export interface PresentedGenerationStatus {
  status: GenerationStatusMessagePart["status"];
  actor: GenerationStatusMessagePart["actor"];
  reason: string;
  partialContentRetained: boolean;
}

export interface PresentedMessage {
  id: string;
  role: string;
  content: RichContent;
  rawContent: string;
  commands: UICommand[];
  suggestions: string[];
  actions: MessageAction[];
  attachments: PresentedAttachment[];
  failedSend?: FailedSendMetadata;
  generationStatus?: PresentedGenerationStatus;
  timestamp: string;
}

type ExtractedTag = {
  text: string;
  payload: unknown[];
};

type ToolCallWithResult = {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
};

function findJsonArrayEnd(input: string, arrayStart: number): number {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = arrayStart; index < input.length; index += 1) {
    const character = input[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (character === "\\") {
      escaping = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "[") {
      depth += 1;
      continue;
    }

    if (character === "]") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function extractTaggedArray(text: string, marker: string): ExtractedTag {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) {
    return { text, payload: [] };
  }

  const arrayStart = markerIndex + marker.length;
  if (text[arrayStart] !== "[") {
    return {
      text: text.slice(0, markerIndex).trimEnd(),
      payload: [],
    };
  }

  const arrayEnd = findJsonArrayEnd(text, arrayStart);
  if (arrayEnd < 0) {
    return {
      text: text.slice(0, markerIndex).trimEnd(),
      payload: [],
    };
  }

  let payload: unknown[] = [];
  try {
    const parsed = JSON.parse(text.slice(arrayStart, arrayEnd + 1));
    if (Array.isArray(parsed)) {
      payload = parsed;
    }
  } catch {
    payload = [];
  }

  return {
    text: `${text.slice(0, markerIndex)}${text.slice(arrayEnd + 1)}`.trim(),
    payload,
  };
}

const DEFAULT_REPAIRED_SUGGESTIONS = DEFAULT_PROMPTS.defaultSuggestions ?? [
  "Go deeper",
  "Show sources",
  "Give next step",
];

function normalizeSuggestions(payload: unknown[], textContent: string): string[] {
  const normalized = Array.from(new Set(
    payload
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && entry.length <= 60),
  )).slice(0, 4);

  if (normalized.length > 0) {
    return normalized;
  }

  return textContent.trim().length > 0 ? DEFAULT_REPAIRED_SUGGESTIONS.slice(0, 4) : [];
}

function getNormalizedString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function sanitizeStringParams(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => [key, (value as string).trim()]),
  );
}

function omitKeys(params: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).filter(([key]) => !keys.includes(key)),
  );
}

function normalizeActionParams(action: ActionLinkType, entry: Record<string, unknown>): Record<string, string> | null {
  const rawParams = typeof entry.params === "object" && entry.params !== null
    ? entry.params as Record<string, unknown>
    : {};
  const sanitizedParams = sanitizeStringParams(rawParams);

  switch (action) {
    case "route": {
      const path = getNormalizedString(rawParams, ["path", "href", "pathname"]) ?? getNormalizedString(entry, ["value"]);
      const baseParams = omitKeys(sanitizedParams, ["path", "href", "pathname"]);
      return path ? { ...baseParams, path } : baseParams;
    }
    case "send": {
      const text = getNormalizedString(rawParams, ["text", "prompt", "message"]) ?? getNormalizedString(entry, ["value"]);
      const baseParams = omitKeys(sanitizedParams, ["text", "prompt", "message"]);
      return text ? { ...baseParams, text } : baseParams;
    }
    case "corpus": {
      const slug = getNormalizedString(rawParams, ["slug", "id"]) ?? getNormalizedString(entry, ["value"]);
      const baseParams = omitKeys(sanitizedParams, ["slug", "id"]);
      return slug ? { ...baseParams, slug } : baseParams;
    }
    case "conversation": {
      const id = getNormalizedString(rawParams, ["id", "conversationId"]) ?? getNormalizedString(entry, ["value"]);
      const baseParams = omitKeys(sanitizedParams, ["id", "conversationId"]);
      return id ? { ...baseParams, id } : baseParams;
    }
    case "external": {
      const url = getNormalizedString(rawParams, ["url", "href", "path"]) ?? getNormalizedString(entry, ["value"]);
      const baseParams = omitKeys(sanitizedParams, ["url", "href", "path"]);
      return url ? { ...baseParams, url } : baseParams;
    }
    case "job": {
      const jobId = getNormalizedString(rawParams, ["jobId", "id"]) ?? getNormalizedString(entry, ["value"]);
      const operation = getNormalizedString(rawParams, ["operation"]);
      const baseParams = omitKeys(sanitizedParams, ["jobId", "id", "operation"]);
      return jobId || operation
        ? {
          ...baseParams,
          ...(jobId ? { jobId } : {}),
          ...(operation ? { operation } : {}),
        }
        : baseParams;
    }
    default:
      return null;
  }
}

function normalizeMessageActions(payload: unknown[]): MessageAction[] {
  return payload
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const label = getNormalizedString(record, ["label"]);
      const action = getNormalizedString(record, ["action", "type"]);

      if (!label || !action || !VALID_ACTION_TYPES.has(action)) {
        return null;
      }

      const params = normalizeActionParams(action as ActionLinkType, record);
      if (!params) {
        return null;
      }

      return {
        label,
        action: action as ActionLinkType,
        params,
      } satisfies MessageAction;
    })
    .filter((entry): entry is MessageAction => Boolean(entry))
    .slice(0, 3);
}

function pairToolCallsWithResults(parts?: MessagePart[]): ToolCallWithResult[] {
  if (!parts) return [];

  const calls: Array<ToolCallWithResult & { consumed?: boolean }> = [];
  for (const part of parts) {
    if (part.type === "tool_call") {
      calls.push({ name: part.name, args: part.args });
      continue;
    }

    if (part.type === "tool_result") {
      const match = calls.find((call) => !call.consumed && call.name === part.name);
      if (match) {
        match.result = part.result;
        match.consumed = true;
      }
    }
  }

  return calls;
}

function sanitizeUiAdjustmentSettings(args: Record<string, unknown>): Record<string, unknown> {
  if (!("theme" in args)) {
    return args;
  }

  const theme = getSupportedTheme(args.theme);
  if (theme) {
    return {
      ...args,
      theme,
    };
  }

  const { theme: _theme, ...rest } = args;
  return rest;
}

function isResolvedGraphPayload(value: unknown): value is ResolvedGraphPayload {
  return (
    typeof value === "object"
    && value !== null
    && "graph" in value
    && typeof (value as { graph?: unknown }).graph === "object"
    && (value as { graph: { kind?: unknown } }).graph !== null
    && typeof (value as { graph: { kind?: unknown } }).graph.kind === "string"
  );
}

function isProfileResultPayload(value: unknown): value is ProfileResultPayload {
  return (
    typeof value === "object"
    && value !== null
    && ((value as { action?: unknown }).action === TOOL_NAMES.GET_MY_PROFILE
      || (value as { action?: unknown }).action === TOOL_NAMES.UPDATE_MY_PROFILE)
    && "profile" in value
    && typeof (value as { profile?: unknown }).profile === "object"
    && (value as { profile?: unknown }).profile !== null
  );
}

function isReferralQrResultPayload(value: unknown): value is ReferralQrResultPayload {
  return (
    typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === TOOL_NAMES.GET_MY_REFERRAL_QR
  );
}

function isJournalWorkflowSummaryPayload(value: unknown): value is JournalWorkflowSummaryPayload {
  return typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === TOOL_NAMES.GET_JOURNAL_WORKFLOW_SUMMARY
    && typeof (value as { summary?: unknown }).summary === "string"
    && typeof (value as { counts?: unknown }).counts === "object"
    && (value as { counts?: unknown }).counts !== null;
}

function isPrepareJournalPostForPublishPayload(value: unknown): value is PrepareJournalPostForPublishPayload {
  return typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === TOOL_NAMES.PREPARE_JOURNAL_POST_FOR_PUBLISH
    && typeof (value as { ready?: unknown }).ready === "boolean"
    && typeof (value as { summary?: unknown }).summary === "string"
    && typeof (value as { post?: unknown }).post === "object"
    && (value as { post?: unknown }).post !== null;
}

function isInspectThemeResultPayload(value: unknown): value is InspectThemeResultPayload {
  return typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === TOOL_NAMES.INSPECT_THEME
    && Array.isArray((value as { supported_theme_ids?: unknown }).supported_theme_ids)
    && Array.isArray((value as { ordered_theme_profiles?: unknown }).ordered_theme_profiles)
    && Array.isArray((value as { approved_control_axes?: unknown }).approved_control_axes)
    && typeof (value as { active_theme_state?: unknown }).active_theme_state === "object"
    && (value as { active_theme_state?: unknown }).active_theme_state !== null;
}

function isNavigateToPageResultPayload(value: unknown): value is NavigateToPageResultPayload {
  return typeof value === "object"
    && value !== null
    && typeof (value as { path?: unknown }).path === "string"
    && Array.isArray((value as { __actions__?: unknown }).__actions__);
}

function isGenerateAudioResultPayload(value: unknown): value is GenerateAudioResultPayload {
  return typeof value === "object"
    && value !== null
    && (value as { action?: unknown }).action === TOOL_NAMES.GENERATE_AUDIO
    && typeof (value as { text?: unknown }).text === "string"
    && typeof (value as { title?: unknown }).title === "string"
    && typeof (value as { provider?: unknown }).provider === "string"
    && typeof (value as { generationStatus?: unknown }).generationStatus === "string"
    && typeof (value as { estimatedDurationSeconds?: unknown }).estimatedDurationSeconds === "number"
    && typeof (value as { estimatedGenerationSeconds?: unknown }).estimatedGenerationSeconds === "number";
}

function isJobStatusMessagePart(part: MessagePart): part is JobStatusMessagePart {
  return part.type === "job_status";
}

function isGenerationStatusMessagePart(part: MessagePart): part is GenerationStatusMessagePart {
  return part.type === "generation_status";
}

function getGenerationStatusPart(parts?: MessagePart[]): GenerationStatusMessagePart | null {
  if (!parts || parts.length === 0) {
    return null;
  }

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (isGenerationStatusMessagePart(part)) {
      return part;
    }
  }

  return null;
}

function textNode(text: string) {
  return { type: "text" as const, text };
}

function actionLinkNode(label: string, value: string) {
  return { type: "action-link" as const, label, actionType: "route" as const, value };
}

function externalActionLinkNode(label: string, value: string) {
  return { type: "action-link" as const, label, actionType: "external" as const, value };
}

function jobActionLinkNode(label: string, jobId: string, operation: "cancel" | "retry") {
  return {
    type: "action-link" as const,
    label,
    actionType: "job" as const,
    value: jobId,
    params: { operation },
  };
}

function isDraftResultPayload(value: unknown): value is { id: string; slug: string; title: string; status: "draft" } {
  return typeof value === "object"
    && value !== null
    && (value as { status?: unknown }).status === "draft"
    && typeof (value as { id?: unknown }).id === "string"
    && typeof (value as { slug?: unknown }).slug === "string"
    && typeof (value as { title?: unknown }).title === "string";
}

function isPublishResultPayload(value: unknown): value is { id: string; slug: string; title: string; status: "published" } {
  return typeof value === "object"
    && value !== null
    && (value as { status?: unknown }).status === "published"
    && typeof (value as { id?: unknown }).id === "string"
    && typeof (value as { slug?: unknown }).slug === "string"
    && typeof (value as { title?: unknown }).title === "string";
}

function isGenerateBlogImageResultPayload(
  value: unknown,
): value is {
  assetId: string;
  imageUrl: string;
  postSlug: string | null;
} {
  return typeof value === "object"
    && value !== null
    && typeof (value as { assetId?: unknown }).assetId === "string"
    && typeof (value as { imageUrl?: unknown }).imageUrl === "string"
    && (typeof (value as { postSlug?: unknown }).postSlug === "string"
      || (value as { postSlug?: unknown }).postSlug === null);
}

function isProduceBlogArticleResultPayload(
  value: unknown,
): value is {
  id: string;
  slug: string;
  imageAssetId: string;
} {
  return typeof value === "object"
    && value !== null
    && typeof (value as { id?: unknown }).id === "string"
    && typeof (value as { slug?: unknown }).slug === "string"
    && typeof (value as { imageAssetId?: unknown }).imageAssetId === "string";
}

function buildJobStatusActions(part: JobStatusMessagePart) {
  if (part.actions && part.actions.length > 0) {
    return part.actions.map((action) => ({
      type: "action-link" as const,
      label: action.label,
      actionType: action.actionType,
      value: action.value,
      params: action.params,
    }));
  }

  if (part.status === "queued" || part.status === "running") {
    return [jobActionLinkNode("Cancel", part.jobId, "cancel")];
  }

  if (part.status === "failed" || part.status === "canceled") {
    return [jobActionLinkNode("Retry", part.jobId, "retry")];
  }

  if (part.status !== "succeeded") {
    return undefined;
  }

  if (part.toolName === "draft_content" && isDraftResultPayload(part.resultPayload)) {
    return [
      {
        type: "action-link" as const,
        label: "Revise",
        actionType: "send" as const,
        value: `Revise the draft post with id ${part.resultPayload.id} titled \"${part.resultPayload.title}\".`,
      },
      {
        type: "action-link" as const,
        label: "Publish",
        actionType: "send" as const,
        value: `Publish the draft post with id ${part.resultPayload.id}.`,
      },
    ];
  }

  if (part.toolName === "publish_content" && isPublishResultPayload(part.resultPayload)) {
    return [actionLinkNode("Open published post", `/journal/${part.resultPayload.slug}`)];
  }

  if (part.toolName === "generate_blog_image" && isGenerateBlogImageResultPayload(part.resultPayload)) {
    const actions = [actionLinkNode("Open image", part.resultPayload.imageUrl)];
    if (part.resultPayload.postSlug) {
      actions.unshift(actionLinkNode("Open article", `/journal/${part.resultPayload.postSlug}`));
    }
    return actions;
  }

  if (part.toolName === "produce_blog_article" && isProduceBlogArticleResultPayload(part.resultPayload)) {
    return [
      actionLinkNode("Open draft", getAdminJournalPreviewPath(part.resultPayload.slug)),
      {
        type: "action-link" as const,
        label: "Publish",
        actionType: "send" as const,
        value: `Publish the draft journal article with id ${part.resultPayload.id}.`,
      },
      actionLinkNode("Open hero image", `/api/blog/assets/${part.resultPayload.imageAssetId}`),
    ];
  }

  if (
    part.toolName === TOOL_NAMES.PREPARE_JOURNAL_POST_FOR_PUBLISH
    && isPrepareJournalPostForPublishPayload(part.resultPayload)
  ) {
    const actions: InlineNode[] = [
      actionLinkNode("Open journal workspace", part.resultPayload.post.detail_route),
      actionLinkNode("Open journal draft", part.resultPayload.post.preview_route),
    ];

    if (part.resultPayload.ready) {
      actions.push({
        type: "action-link" as const,
        label: "Publish",
        actionType: "send" as const,
        value: `Publish the approved journal article with id ${part.resultPayload.post.id}.`,
      });
    }

    return actions;
  }

  return undefined;
}

function appendProfileResultBlocks(
  richContent: RichContent,
  result: ProfileResultPayload,
): void {
  const rows = [
    [textNode("Name"), textNode(result.profile.name)],
    [textNode("Email"), textNode(result.profile.email)],
    [textNode("Credential"), textNode(result.profile.credential?.trim() || "Not set")],
    [textNode("Roles"), textNode((result.profile.roles ?? []).join(", ") || "None")],
    [textNode("Referral access"), textNode(result.profile.affiliate_enabled ? "Enabled" : "Not enabled")],
    [textNode("Referral code"), textNode(result.profile.referral_code ?? "Not assigned")],
    [textNode("Referral link"), textNode(result.profile.referral_url ?? "Not available")],
  ];

  richContent.blocks.push({
    type: BLOCK_TYPES.HEADING,
    level: 2,
    content: [textNode(result.action === TOOL_NAMES.UPDATE_MY_PROFILE ? "Profile Updated" : "Current Profile")],
  });

  if (result.message) {
    richContent.blocks.push({
      type: BLOCK_TYPES.PARAGRAPH,
      content: [textNode(result.message)],
    });
  }

  richContent.blocks.push({
    type: BLOCK_TYPES.TABLE,
    header: [[textNode("Field")], [textNode("Value")]],
    rows: rows.map((row) => row.map((cell) => [cell])),
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.PARAGRAPH,
    content: [
      textNode("Open your "),
      actionLinkNode("profile page", "/profile"),
      textNode(" to manage the same fields and referral settings."),
    ],
  });
}

function appendReferralQrResultBlocks(
  richContent: RichContent,
  result: ReferralQrResultPayload,
): void {
  richContent.blocks.push({
    type: BLOCK_TYPES.HEADING,
    level: 2,
    content: [textNode("Referral QR")],
  });

  if ("error" in result) {
    richContent.blocks.push({
      type: BLOCK_TYPES.BLOCKQUOTE,
      content: [textNode(result.error)],
    });

    richContent.blocks.push({
      type: BLOCK_TYPES.PARAGRAPH,
      content: [
        textNode("You can check availability from your "),
        actionLinkNode("profile page", result.manage_route ?? "/profile"),
        textNode(" once affiliate access is enabled."),
      ],
    });
    return;
  }

  if (result.message) {
    richContent.blocks.push({
      type: BLOCK_TYPES.PARAGRAPH,
      content: [textNode(result.message)],
    });
  }

  richContent.blocks.push({
    type: BLOCK_TYPES.TABLE,
    header: [[textNode("Field")], [textNode("Value")]],
    rows: [
      [[textNode("Referral code")], [textNode(result.referral_code)]],
      [[textNode("Referral link")], [textNode(result.referral_url)]],
      [[textNode("QR image URL")], [textNode(result.qr_code_url)]],
    ],
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.LIST,
    items: [
      [textNode("Use the referral link for direct sharing.")],
      [externalActionLinkNode("Open referral link", result.referral_url)],
      [externalActionLinkNode("Open QR image", result.qr_code_url)],
      [textNode("Open your "), actionLinkNode("profile page", result.manage_route ?? "/profile"), textNode(" to preview or download the QR image.")],
    ],
  });
}

function appendJournalWorkflowSummaryBlocks(
  richContent: RichContent,
  result: JournalWorkflowSummaryPayload,
): void {
  richContent.blocks.push({
    type: BLOCK_TYPES.HEADING,
    level: 2,
    content: [textNode("Journal Workflow Summary")],
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.PARAGRAPH,
    content: [textNode(result.summary)],
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.TABLE,
    header: [[textNode("Queue")], [textNode("Count")]],
    rows: [
      [[textNode("Draft")], [textNode(String(result.counts.draft))]],
      [[textNode("In review")], [textNode(String(result.counts.review))]],
      [[textNode("Approved")], [textNode(String(result.counts.approved))]],
      [[textNode("Blocked")], [textNode(String(result.counts.blocked))]],
      [[textNode("Ready to publish")], [textNode(String(result.counts.ready_to_publish))]],
      [[textNode("Active jobs")], [textNode(String(result.counts.active_jobs))]],
    ],
  });

  if (result.blocked_posts && result.blocked_posts.length > 0) {
    richContent.blocks.push({
      type: BLOCK_TYPES.LIST,
      items: result.blocked_posts.slice(0, 3).map((post) => [
        textNode(`${post.title}: ${post.blockers.join(" ")}`),
        textNode(" "),
        actionLinkNode("Open workspace", post.detail_route),
      ]),
    });
  }

  if (result.ready_to_publish_posts && result.ready_to_publish_posts.length > 0) {
    richContent.blocks.push({
      type: BLOCK_TYPES.LIST,
      items: result.ready_to_publish_posts.slice(0, 3).map((post) => [
        textNode(`${post.title} is ready to publish. `),
        actionLinkNode("Open workspace", post.detail_route),
        textNode(" · "),
        actionLinkNode("Open preview", post.preview_route),
      ]),
    });
  }
}

function appendPrepareJournalPostBlocks(
  richContent: RichContent,
  result: PrepareJournalPostForPublishPayload,
): void {
  richContent.blocks.push({
    type: BLOCK_TYPES.HEADING,
    level: 2,
    content: [textNode(result.ready ? "Journal Publish Ready" : "Journal Publish Blocked")],
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.PARAGRAPH,
    content: [textNode(result.summary)],
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.TABLE,
    header: [[textNode("Field")], [textNode("Value")]],
    rows: [
      [[textNode("Article")], [textNode(result.post.title)]],
      [[textNode("Ready")], [textNode(result.ready ? "Yes" : "No")]],
      [[textNode("Revision count")], [textNode(String(result.revision_count))]],
    ],
  });

  if (result.blockers.length > 0) {
    richContent.blocks.push({
      type: BLOCK_TYPES.LIST,
      items: result.blockers.map((blocker) => [textNode(blocker)]),
    });
  }

  richContent.blocks.push({
    type: BLOCK_TYPES.LIST,
    items: [
      [actionLinkNode("Open journal workspace", result.post.detail_route)],
      [actionLinkNode("Open journal draft", result.post.preview_route)],
      ...(result.ready
        ? [[{
          type: "action-link" as const,
          label: "Publish",
          actionType: "send" as const,
          value: `Publish the approved journal article with id ${result.post.id}.`,
        }]]
        : []),
    ],
  });
}

function formatThemeAxisOption(option: unknown): string {
  if (typeof option === "string") {
    return option;
  }

  if (typeof option === "boolean") {
    return option ? "true" : "false";
  }

  return String(option);
}

function appendInspectThemeBlocks(
  richContent: RichContent,
  result: InspectThemeResultPayload,
): void {
  richContent.blocks.push({
    type: BLOCK_TYPES.HEADING,
    level: 2,
    content: [textNode("Theme Profiles")],
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.PARAGRAPH,
    content: [textNode(result.message)],
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.TABLE,
    header: [[textNode("Theme")], [textNode("Intent")], [textNode("Density defaults")], [textNode("Attributes")]],
    rows: result.ordered_theme_profiles.map((profile) => [[
      textNode(`${profile.name} (${profile.id})`),
    ], [
      textNode(`${profile.motionIntent} motion / ${profile.shadowIntent} depth`),
    ], [
      textNode(`standard ${profile.densityDefaults.standard}, data-dense ${profile.densityDefaults.dataDense}, touch ${profile.densityDefaults.touch}`),
    ], [
      textNode(profile.primaryAttributes.join(", ")),
    ]]),
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.LIST,
    items: result.approved_control_axes.map((axis) => [
      textNode(`${axis.label}: default ${formatThemeAxisOption(axis.defaultValue)}. Options ${axis.options.map(formatThemeAxisOption).join(", ")}. Mutated by ${axis.mutationTools.join(", ")}.`),
    ]),
  });

  richContent.blocks.push({
    type: BLOCK_TYPES.PARAGRAPH,
    content: [textNode(`Supported theme ids: ${result.supported_theme_ids.join(", ")}.`)],
  });

  if (!result.active_theme_state.available) {
    richContent.blocks.push({
      type: BLOCK_TYPES.BLOCKQUOTE,
      content: [textNode(result.active_theme_state.reason)],
    });
  }
}

export class ChatPresenter {
  constructor(
    private markdownParser: MarkdownParserService,
    private commandParser: CommandParserService,
  ) {}

  present(message: ChatMessage): PresentedMessage {
    let textContent = message.content;
    let suggestions: string[] = [];
    let actions: MessageAction[] = [];

    const extractedSuggestions = extractTaggedArray(textContent, SUGGESTIONS_MARKER);
    suggestions = normalizeSuggestions(extractedSuggestions.payload, extractedSuggestions.text);
    textContent = extractedSuggestions.text;

    const extractedActions = extractTaggedArray(textContent, ACTIONS_MARKER);
    actions = normalizeMessageActions(extractedActions.payload);
    textContent = extractedActions.text;

    const richContent = this.markdownParser.parse(textContent);
    const commands = [...this.commandParser.parse(textContent)];
    const attachments = getPresentedAttachments(message.parts);
    const generationStatus = getGenerationStatusPart(message.parts);
    const renderedJobIds = new Set<string>();

    for (const part of message.parts ?? []) {
      if (!isJobStatusMessagePart(part)) {
        continue;
      }

      renderedJobIds.add(part.jobId);

      richContent.blocks.push({
        type: BLOCK_TYPES.JOB_STATUS,
        jobId: part.jobId,
        label: part.label,
        toolName: part.toolName,
          title: part.title,
          subtitle: part.subtitle,
        status: part.status,
        progressPercent: part.progressPercent,
        progressLabel: part.progressLabel,
        summary: part.summary,
        error: part.error,
        actions: buildJobStatusActions(part),
      });
    }

    // Map AI tool calls to UI commands
    const toolCalls = pairToolCallsWithResults(message.parts);
    for (const call of toolCalls) {
      switch (call.name) {
        case TOOL_NAMES.SET_THEME:
          if (isSupportedTheme(call.args.theme)) {
            commands.push({
              type: UI_COMMAND_TYPE.SET_THEME,
              theme: call.args.theme,
            });
          }
          break;
        case TOOL_NAMES.NAVIGATE:
          commands.push({
            type: UI_COMMAND_TYPE.NAVIGATE,
            path: call.args.path as string,
          });
          break;
        case TOOL_NAMES.NAVIGATE_TO_PAGE:
          if (isNavigateToPageResultPayload(call.result)) {
            commands.push({
              type: UI_COMMAND_TYPE.NAVIGATE,
              path: call.result.path,
            });
          }
          break;
        case TOOL_NAMES.ADJUST_UI:
          commands.push({
            type: UI_COMMAND_TYPE.ADJUST_UI,
            settings: sanitizeUiAdjustmentSettings(call.args as Record<string, unknown>),
          });
          break;
        case TOOL_NAMES.INSPECT_THEME:
          if (isInspectThemeResultPayload(call.result)) {
            appendInspectThemeBlocks(richContent, call.result);
          }
          break;
        case TOOL_NAMES.GENERATE_CHART:
          try {
            const chart = resolveGenerateChartPayload(call.args as Record<string, unknown>);
            richContent.blocks.push({
              type: BLOCK_TYPES.CODE,
              code: chart.code,
              language: "mermaid",
              title: chart.title,
              caption: chart.caption,
              downloadFileName: chart.downloadFileName,
            });
          } catch {
            // Ignore invalid chart payloads so malformed tool calls do not render broken Mermaid blocks.
          }
          break;
        case TOOL_NAMES.GENERATE_GRAPH:
          try {
            const graph = isResolvedGraphPayload(call.result)
              ? call.result
              : resolveGenerateGraphPayload(call.args as Record<string, unknown>);
            richContent.blocks.push({
              type: BLOCK_TYPES.GRAPH,
              graph: graph.graph,
              title: graph.title,
              caption: graph.caption,
              summary: graph.summary,
              downloadFileName: graph.downloadFileName,
              dataPreview: graph.dataPreview,
              source: graph.source,
            });
          } catch {
            // Ignore invalid graph payloads so malformed tool calls do not render broken graph blocks.
          }
          break;
        case TOOL_NAMES.GENERATE_AUDIO:
          if (isGenerateAudioResultPayload(call.result)) {
            richContent.blocks.push({
              type: BLOCK_TYPES.AUDIO,
              text: call.result.text,
              title: call.result.title,
              assetId: call.result.assetId ?? undefined,
              provider: call.result.provider,
              generationStatus: call.result.generationStatus,
              estimatedDurationSeconds: call.result.estimatedDurationSeconds,
              estimatedGenerationSeconds: call.result.estimatedGenerationSeconds,
            });
            break;
          }

          richContent.blocks.push({
            type: BLOCK_TYPES.AUDIO,
            text: typeof call.args.text === "string" ? call.args.text : "",
            title: typeof call.args.title === "string" ? call.args.title : "",
            assetId: typeof call.args.assetId === "string" ? call.args.assetId : undefined,
          });
          break;
        case TOOL_NAMES.ADMIN_WEB_SEARCH:
          richContent.blocks.push({
            type: BLOCK_TYPES.WEB_SEARCH,
            query: typeof call.args.query === "string" ? call.args.query : "",
            allowed_domains: Array.isArray(call.args.allowed_domains)
              ? (call.args.allowed_domains as string[])
              : undefined,
            model: typeof call.args.model === "string" ? call.args.model : undefined,
          });
          break;
        case TOOL_NAMES.GET_MY_PROFILE:
        case TOOL_NAMES.UPDATE_MY_PROFILE:
          if (isProfileResultPayload(call.result)) {
            appendProfileResultBlocks(richContent, call.result);
          }
          break;
        case TOOL_NAMES.GET_MY_REFERRAL_QR:
          if (isReferralQrResultPayload(call.result)) {
            appendReferralQrResultBlocks(richContent, call.result);
          }
          break;
        case TOOL_NAMES.GET_JOURNAL_WORKFLOW_SUMMARY:
          if (isJournalWorkflowSummaryPayload(call.result)) {
            appendJournalWorkflowSummaryBlocks(richContent, call.result);
          }
          break;
        case TOOL_NAMES.PREPARE_JOURNAL_POST_FOR_PUBLISH:
          if (isPrepareJournalPostForPublishPayload(call.result)) {
            appendPrepareJournalPostBlocks(richContent, call.result);
          }
          break;
        default: {
          const jobSnapshots = extractJobStatusSnapshots(call.result);
          for (const snapshot of jobSnapshots) {
            if (renderedJobIds.has(snapshot.part.jobId)) {
              continue;
            }

            renderedJobIds.add(snapshot.part.jobId);
            richContent.blocks.push({
              type: BLOCK_TYPES.JOB_STATUS,
              jobId: snapshot.part.jobId,
              label: snapshot.part.label,
              toolName: snapshot.part.toolName,
              title: snapshot.part.title,
              subtitle: snapshot.part.subtitle,
              status: snapshot.part.status,
              progressPercent: snapshot.part.progressPercent,
              progressLabel: snapshot.part.progressLabel,
              summary: snapshot.part.summary,
              error: snapshot.part.error,
              actions: buildJobStatusActions(snapshot.part),
            });
          }
          break;
        }
      }
    }

    return {
      id: message.id,
      role: message.role,
      content: richContent,
      rawContent: textContent,
      commands: commands,
      suggestions: suggestions,
      actions,
      attachments,
      failedSend: message.metadata?.failedSend,
      generationStatus: generationStatus
        ? {
          status: generationStatus.status,
          actor: generationStatus.actor,
          reason: generationStatus.reason,
          partialContentRetained: generationStatus.partialContentRetained,
        }
        : undefined,
      timestamp: (message.timestamp || new Date()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  presentMany(messages: ChatMessage[]): PresentedMessage[] {
    return messages.map((m) => this.present(m));
  }
}

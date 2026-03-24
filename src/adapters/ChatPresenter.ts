import type { ChatMessage, FailedSendMetadata } from "../core/entities/chat-message";
import type { RichContent } from "../core/entities/rich-content";
import type { UICommand } from "../core/entities/ui-command";
import { UI_COMMAND_TYPE } from "../core/entities/ui-command";
import { BLOCK_TYPES, VALID_ACTION_TYPES } from "../core/entities/rich-content";
import type { ActionLinkType } from "../core/entities/rich-content";
import { getAttachmentParts, type AttachmentPart } from "@/lib/chat/message-attachments";
import type { MarkdownParserService } from "./MarkdownParserService";
import type { CommandParserService } from "./CommandParserService";
import { resolveGenerateChartPayload } from "@/core/use-cases/tools/chart-payload";
import { resolveGenerateGraphPayload, type ResolvedGraphPayload } from "@/core/use-cases/tools/graph-payload";
import type { MessagePart } from "@/core/entities/message-parts";

const SUGGESTIONS_MARKER = "__suggestions__:";
const ACTIONS_MARKER = "__actions__:";

const TOOL_NAMES = {
  SET_THEME: "set_theme",
  NAVIGATE: "navigate",
  ADJUST_UI: "adjust_ui",
  GENERATE_CHART: "generate_chart",
  GENERATE_GRAPH: "generate_graph",
  GENERATE_AUDIO: "generate_audio",
  ADMIN_WEB_SEARCH: "admin_web_search",
  GET_MY_PROFILE: "get_my_profile",
  UPDATE_MY_PROFILE: "update_my_profile",
  GET_MY_REFERRAL_QR: "get_my_referral_qr",
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

export interface MessageAction {
  label: string;
  action: ActionLinkType;
  params: Record<string, string>;
}

export interface PresentedMessage {
  id: string;
  role: string;
  content: RichContent;
  rawContent: string;
  commands: UICommand[];
  suggestions: string[];
  actions: MessageAction[];
  attachments: AttachmentPart[];
  failedSend?: FailedSendMetadata;
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

function textNode(text: string) {
  return { type: "text" as const, text };
}

function actionLinkNode(label: string, value: string) {
  return { type: "action-link" as const, label, actionType: "route" as const, value };
}

function externalActionLinkNode(label: string, value: string) {
  return { type: "action-link" as const, label, actionType: "external" as const, value };
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
    if (extractedSuggestions.payload.length > 0) {
      suggestions = extractedSuggestions.payload.filter(
        (entry): entry is string => typeof entry === "string",
      );
    }
    textContent = extractedSuggestions.text;

    const extractedActions = extractTaggedArray(textContent, ACTIONS_MARKER);
    actions = extractedActions.payload.filter(
      (entry): entry is MessageAction =>
        typeof entry === "object" &&
        entry !== null &&
        "action" in entry &&
        typeof (entry as MessageAction).action === "string" &&
        VALID_ACTION_TYPES.has((entry as MessageAction).action),
    );
    textContent = extractedActions.text;

    const richContent = this.markdownParser.parse(textContent);
    const commands = this.commandParser.parse(textContent);
  const attachments = getAttachmentParts(message.parts);

    // Map AI tool calls to UI commands
    const toolCalls = pairToolCallsWithResults(message.parts);
    for (const call of toolCalls) {
      switch (call.name) {
        case TOOL_NAMES.SET_THEME:
          commands.push({
            type: UI_COMMAND_TYPE.SET_THEME,
            theme: call.args.theme as string,
          });
          break;
        case TOOL_NAMES.NAVIGATE:
          commands.push({
            type: UI_COMMAND_TYPE.NAVIGATE,
            path: call.args.path as string,
          });
          break;
        case TOOL_NAMES.ADJUST_UI:
          commands.push({
            type: UI_COMMAND_TYPE.ADJUST_UI,
            settings: call.args as Record<string, unknown>,
          });
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
          richContent.blocks.push({
            type: BLOCK_TYPES.AUDIO,
            text: typeof call.args.text === "string" ? call.args.text : "",
            title: typeof call.args.title === "string" ? call.args.title : "",
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

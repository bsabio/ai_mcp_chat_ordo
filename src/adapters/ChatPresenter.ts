import type { ChatMessage } from "../core/entities/chat-message";
import { extractToolCalls } from "../core/entities/chat-message";
import type { RichContent } from "../core/entities/rich-content";
import type { UICommand } from "../core/entities/ui-command";
import { UI_COMMAND_TYPE } from "../core/entities/ui-command";
import { BLOCK_TYPES } from "../core/entities/rich-content";
import type { MarkdownParserService } from "./MarkdownParserService";
import type { CommandParserService } from "./CommandParserService";

const SUGGESTION_REGEX = /__suggestions__:\[([\s\S]*?)\]/;

const TOOL_NAMES = {
  SET_THEME: "set_theme",
  NAVIGATE: "navigate",
  ADJUST_UI: "adjust_ui",
  GENERATE_CHART: "generate_chart",
  GENERATE_AUDIO: "generate_audio",
  ADMIN_WEB_SEARCH: "admin_web_search",
} as const;

export interface PresentedMessage {
  id: string;
  role: string;
  content: RichContent;
  rawContent: string;
  commands: UICommand[];
  suggestions: string[];
  timestamp: string;
}

export class ChatPresenter {
  constructor(
    private markdownParser: MarkdownParserService,
    private commandParser: CommandParserService,
  ) {}

  present(message: ChatMessage): PresentedMessage {
    let textContent = message.content;
    let suggestions: string[] = [];

    // Extract and remove suggestions
    const match = textContent.match(SUGGESTION_REGEX);
    if (match && match[1]) {
      try {
        // Reconstruct JSON array string
        const jsonStr = `[${match[1]}]`;
        suggestions = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse suggestions", e);
      }
      textContent = textContent.replace(SUGGESTION_REGEX, "").trim();
    }

    const richContent = this.markdownParser.parse(textContent);
    const commands = this.commandParser.parse(textContent);

    // Map AI tool calls to UI commands
    const toolCalls = extractToolCalls(message.parts);
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
          richContent.blocks.push({
            type: BLOCK_TYPES.CODE,
            code: typeof call.args.code === "string" ? call.args.code : "",
            language: "mermaid",
          });
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
      }
    }

    return {
      id: message.id || Math.random().toString(),
      role: message.role,
      content: richContent,
      rawContent: textContent,
      commands: commands,
      suggestions: suggestions,
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

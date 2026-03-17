import type { StreamEvent } from "../../core/entities/chat-stream";

type RawSSEData = Record<string, unknown>;

/**
 * Strategy Interface for Parsing Raw SSE JSON Data
 */
export interface EventParserStrategy {
  canParse(data: RawSSEData): boolean;
  parse(data: RawSSEData): StreamEvent;
}

export class TextDeltaParser implements EventParserStrategy {
  canParse(data: RawSSEData) { return !!data.delta; }
  parse(data: RawSSEData): StreamEvent {
    return { type: "text", delta: data.delta as string };
  }
}

export class ToolCallParser implements EventParserStrategy {
  canParse(data: RawSSEData) { return !!data.tool_call; }
  parse(data: RawSSEData): StreamEvent {
    const tc = data.tool_call as { name: string; args: Record<string, unknown> };
    return { 
      type: "tool_call", 
      name: tc.name, 
      args: tc.args 
    };
  }
}

export class ToolResultParser implements EventParserStrategy {
  canParse(data: RawSSEData) { return !!data.tool_result; }
  parse(data: RawSSEData): StreamEvent {
    const tr = data.tool_result as { name: string; result: unknown };
    return { 
      type: "tool_result", 
      name: tr.name, 
      result: tr.result 
    };
  }
}

export class ConversationIdParser implements EventParserStrategy {
  canParse(data: RawSSEData) { return !!data.conversation_id; }
  parse(data: RawSSEData): StreamEvent {
    return { type: "conversation_id", id: data.conversation_id as string };
  }
}

export class ErrorParser implements EventParserStrategy {
  canParse(data: RawSSEData) { return typeof data.error === "string"; }
  parse(data: RawSSEData): StreamEvent {
    return { type: "error", message: data.error as string };
  }
}

export class EventParser {
  constructor(private strategies: EventParserStrategy[]) {}

  parse(data: RawSSEData): StreamEvent | null {
    const strategy = this.strategies.find(s => s.canParse(data));
    return strategy ? strategy.parse(data) : null;
  }
}

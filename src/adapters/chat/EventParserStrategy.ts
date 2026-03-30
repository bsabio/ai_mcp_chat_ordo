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

class TypedEventParser implements EventParserStrategy {
  constructor(private readonly eventType: StreamEvent["type"]) {}

  canParse(data: RawSSEData) {
    return data.type === this.eventType;
  }

  parse(data: RawSSEData): StreamEvent {
    switch (this.eventType) {
      case "job_queued":
      case "job_started":
        return {
          type: this.eventType,
          jobId: data.jobId as string,
          conversationId: data.conversationId as string,
          sequence: data.sequence as number,
          toolName: data.toolName as string,
          label: data.label as string,
          messageId: typeof data.messageId === "string" ? data.messageId : undefined,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
        };
      case "job_progress":
        return {
          type: "job_progress",
          jobId: data.jobId as string,
          conversationId: data.conversationId as string,
          sequence: data.sequence as number,
          toolName: data.toolName as string,
          label: data.label as string,
          messageId: typeof data.messageId === "string" ? data.messageId : undefined,
          progressPercent: typeof data.progressPercent === "number" ? data.progressPercent : undefined,
          progressLabel: typeof data.progressLabel === "string" ? data.progressLabel : undefined,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
        };
      case "job_completed":
        return {
          type: "job_completed",
          jobId: data.jobId as string,
          conversationId: data.conversationId as string,
          sequence: data.sequence as number,
          toolName: data.toolName as string,
          label: data.label as string,
          messageId: typeof data.messageId === "string" ? data.messageId : undefined,
          summary: typeof data.summary === "string" ? data.summary : undefined,
          resultPayload: data.resultPayload,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
        };
      case "job_failed":
        return {
          type: "job_failed",
          jobId: data.jobId as string,
          conversationId: data.conversationId as string,
          sequence: data.sequence as number,
          toolName: data.toolName as string,
          label: data.label as string,
          messageId: typeof data.messageId === "string" ? data.messageId : undefined,
          error: data.error as string,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
        };
      case "job_canceled":
        return {
          type: "job_canceled",
          jobId: data.jobId as string,
          conversationId: data.conversationId as string,
          sequence: data.sequence as number,
          toolName: data.toolName as string,
          label: data.label as string,
          messageId: typeof data.messageId === "string" ? data.messageId : undefined,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
        };
      default:
        throw new Error(`Unsupported typed SSE event: ${String(this.eventType)}`);
    }
  }
}

export class JobQueuedParser extends TypedEventParser {
  constructor() {
    super("job_queued");
  }
}

export class JobStartedParser extends TypedEventParser {
  constructor() {
    super("job_started");
  }
}

export class JobProgressParser extends TypedEventParser {
  constructor() {
    super("job_progress");
  }
}

export class JobCompletedParser extends TypedEventParser {
  constructor() {
    super("job_completed");
  }
}

export class JobFailedParser extends TypedEventParser {
  constructor() {
    super("job_failed");
  }
}

export class JobCanceledParser extends TypedEventParser {
  constructor() {
    super("job_canceled");
  }
}

export class EventParser {
  constructor(private strategies: EventParserStrategy[]) {}

  parse(data: RawSSEData): StreamEvent | null {
    const strategy = this.strategies.find(s => s.canParse(data));
    return strategy ? strategy.parse(data) : null;
  }
}

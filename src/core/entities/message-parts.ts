/**
 * Domain types for message parts (tool calls, text segments, tool results).
 * Defined in the core layer so entities and use-cases can reference them
 * without depending on React hooks or framework code.
 */
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown }
  | {
      type: "attachment";
      assetId: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }
  | { type: "summary"; text: string; coversUpToMessageId: string }
  | { type: "meta_summary"; text: string; coversUpToSummaryId: string; summariesCompacted: number };

export const INLINE_TYPES = {
  TEXT: "text",
  BOLD: "bold",
  CODE: "code-inline",
  LINK: "library-link",
  ACTION_LINK: "action-link",
} as const;

export type ActionLinkType = "conversation" | "route" | "send" | "corpus" | "external" | "job";

export const VALID_ACTION_TYPES: ReadonlySet<string> = new Set<string>(["conversation", "route", "send", "corpus", "external", "job"]);

export const BLOCK_TYPES = {
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  LIST: "list",
  BLOCKQUOTE: "blockquote",
  JOB_STATUS: "job-status",
  CODE: "code-block",
  GRAPH: "graph",
  TABLE: "table",
  DIVIDER: "divider",
  OPERATOR_BRIEF: "operator-brief",
  AUDIO: "audio",
  WEB_SEARCH: "web-search",
} as const;

export type OperatorBriefSection = {
  label: "NOW" | "NEXT" | "WAIT";
  summary: InlineNode[];
  items?: InlineNode[][];
};

export type GraphValue = string | number | boolean | null;

export type GraphRow = Record<string, GraphValue>;

export type GraphAxisType = "quantitative" | "temporal" | "nominal" | "ordinal";

export type GraphEncoding = {
  field: string;
  type: GraphAxisType;
  label?: string;
  aggregate?: "sum" | "avg" | "count" | "min" | "max" | "median";
};

export type GraphKind =
  | "line"
  | "area"
  | "bar"
  | "grouped-bar"
  | "stacked-bar"
  | "scatter"
  | "bubble"
  | "histogram"
  | "heatmap"
  | "table";

export type GraphSourceMeta = {
  sourceType: string;
  label: string;
  rowCount: number;
};

export type GraphSpec = {
  kind: GraphKind;
  data: GraphRow[];
  columns?: string[];
  x?: GraphEncoding;
  y?: GraphEncoding;
  series?: GraphEncoding;
  color?: GraphEncoding;
  size?: GraphEncoding;
  tooltip?: GraphEncoding[];
  source?: GraphSourceMeta;
};

export type InlineNode =
  | { type: typeof INLINE_TYPES.TEXT; text: string }
  | { type: typeof INLINE_TYPES.BOLD; text: string }
  | { type: typeof INLINE_TYPES.CODE; text: string }
  | { type: typeof INLINE_TYPES.LINK; slug: string }
  | { type: typeof INLINE_TYPES.ACTION_LINK; label: string; actionType: ActionLinkType; value: string; params?: Record<string, string> };

export type BlockNode =
  | { type: typeof BLOCK_TYPES.PARAGRAPH; content: InlineNode[] }
  | { type: typeof BLOCK_TYPES.HEADING; level: 1 | 2 | 3; content: InlineNode[] }
  | { type: typeof BLOCK_TYPES.LIST; items: InlineNode[][] }
  | { type: typeof BLOCK_TYPES.BLOCKQUOTE; content: InlineNode[] }
  | {
      type: typeof BLOCK_TYPES.JOB_STATUS;
      jobId: string;
      label: string;
      toolName: string;
      title?: string;
      subtitle?: string;
      status: "queued" | "running" | "succeeded" | "failed" | "canceled";
      progressPercent?: number | null;
      progressLabel?: string | null;
      summary?: string;
      error?: string;
      actions?: InlineNode[];
    }
  | {
      type: typeof BLOCK_TYPES.CODE;
      code: string;
      language?: string;
      title?: string;
      caption?: string;
      downloadFileName?: string;
    }
  | {
      type: typeof BLOCK_TYPES.GRAPH;
      graph: GraphSpec;
      title?: string;
      caption?: string;
      summary?: string;
      downloadFileName?: string;
      dataPreview?: GraphRow[];
      source?: GraphSourceMeta;
    }
  | { type: typeof BLOCK_TYPES.TABLE; header?: InlineNode[][]; rows: InlineNode[][][] }
  | { type: typeof BLOCK_TYPES.DIVIDER }
  | { type: typeof BLOCK_TYPES.OPERATOR_BRIEF; sections: OperatorBriefSection[] }
  | { type: typeof BLOCK_TYPES.AUDIO; text: string; title: string; assetId?: string }
  | { type: typeof BLOCK_TYPES.WEB_SEARCH; query: string; allowed_domains?: string[]; model?: string };

export interface RichContent {
  blocks: BlockNode[];
}

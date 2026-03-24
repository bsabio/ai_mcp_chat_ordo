export const INLINE_TYPES = {
  TEXT: "text",
  BOLD: "bold",
  CODE: "code-inline",
  LINK: "library-link",
  ACTION_LINK: "action-link",
} as const;

export type ActionLinkType = "conversation" | "route" | "send" | "corpus";

export const VALID_ACTION_TYPES: ReadonlySet<string> = new Set<string>(["conversation", "route", "send", "corpus"]);

export const BLOCK_TYPES = {
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  LIST: "list",
  BLOCKQUOTE: "blockquote",
  CODE: "code-block",
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
  | { type: typeof BLOCK_TYPES.CODE; code: string; language?: string }
  | { type: typeof BLOCK_TYPES.TABLE; header?: InlineNode[][]; rows: InlineNode[][][] }
  | { type: typeof BLOCK_TYPES.DIVIDER }
  | { type: typeof BLOCK_TYPES.OPERATOR_BRIEF; sections: OperatorBriefSection[] }
  | { type: typeof BLOCK_TYPES.AUDIO; text: string; title: string; assetId?: string }
  | { type: typeof BLOCK_TYPES.WEB_SEARCH; query: string; allowed_domains?: string[]; model?: string };

export interface RichContent {
  blocks: BlockNode[];
}

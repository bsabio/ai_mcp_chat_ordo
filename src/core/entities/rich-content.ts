export const INLINE_TYPES = {
  TEXT: "text",
  BOLD: "bold",
  CODE: "code-inline",
  LINK: "library-link",
} as const;

export const BLOCK_TYPES = {
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  LIST: "list",
  BLOCKQUOTE: "blockquote",
  CODE: "code-block",
  TABLE: "table",
  DIVIDER: "divider",
  AUDIO: "audio",
  WEB_SEARCH: "web-search",
} as const;

export type InlineNode =
  | { type: typeof INLINE_TYPES.TEXT; text: string }
  | { type: typeof INLINE_TYPES.BOLD; text: string }
  | { type: typeof INLINE_TYPES.CODE; text: string }
  | { type: typeof INLINE_TYPES.LINK; slug: string };

export type BlockNode =
  | { type: typeof BLOCK_TYPES.PARAGRAPH; content: InlineNode[] }
  | { type: typeof BLOCK_TYPES.HEADING; level: 1 | 2 | 3; content: InlineNode[] }
  | { type: typeof BLOCK_TYPES.LIST; items: InlineNode[][] }
  | { type: typeof BLOCK_TYPES.BLOCKQUOTE; content: InlineNode[] }
  | { type: typeof BLOCK_TYPES.CODE; code: string; language?: string }
  | { type: typeof BLOCK_TYPES.TABLE; header?: InlineNode[][]; rows: InlineNode[][][] }
  | { type: typeof BLOCK_TYPES.DIVIDER }
  | { type: typeof BLOCK_TYPES.AUDIO; text: string; title: string }
  | { type: typeof BLOCK_TYPES.WEB_SEARCH; query: string; allowed_domains?: string[]; model?: string };

export interface RichContent {
  blocks: BlockNode[];
}

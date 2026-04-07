import { z } from "zod";

const CurrentPageSnapshotSchema = z.object({
  pathname: z.string().max(500),
  title: z.string().max(200).nullable().optional(),
  mainHeading: z.string().max(200).nullable().optional(),
  sectionHeadings: z.array(z.string().max(160)).max(6).optional().default([]),
  selectedText: z.string().max(400).nullable().optional(),
  contentExcerpt: z.string().max(1600).nullable().optional(),
});

export const ChatStreamRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(100_000),
      }),
    )
    .min(1),
  conversationId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        assetId: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
      }),
    )
    .optional()
    .default([]),
  taskOriginHandoff: z.unknown().optional(),
  currentPathname: z.string().max(500).optional(),
  currentPageSnapshot: CurrentPageSnapshotSchema.optional(),
});

export type ChatStreamRequest = z.infer<typeof ChatStreamRequestSchema>;

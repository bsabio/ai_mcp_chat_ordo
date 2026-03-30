import { z } from "zod";

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
});

export type ChatStreamRequest = z.infer<typeof ChatStreamRequestSchema>;

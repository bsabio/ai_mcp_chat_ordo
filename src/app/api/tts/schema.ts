import { z } from "zod";

export const TtsRequestSchema = z.object({
  text: z.string().min(1).max(4096),
  conversationId: z.string().nullable().optional(),
});

export type TtsRequest = z.infer<typeof TtsRequestSchema>;

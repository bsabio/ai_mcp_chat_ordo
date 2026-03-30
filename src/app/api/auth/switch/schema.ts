import { z } from "zod";

export const AuthSwitchRequestSchema = z.object({
  role: z.enum(["ANONYMOUS", "AUTHENTICATED", "STAFF", "ADMIN"]),
});

export type AuthSwitchRequest = z.infer<typeof AuthSwitchRequestSchema>;

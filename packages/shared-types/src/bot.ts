import { z } from "zod";

export const botStatusEnum = z.enum(["stopped", "running", "paused", "emergency_stopped"]);
export type BotStatus = z.infer<typeof botStatusEnum>;

export const botStatusResponseSchema = z.object({
  status: botStatusEnum,
  name: z.string(),
  updatedAt: z.string().datetime(),
});
export type BotStatusResponse = z.infer<typeof botStatusResponseSchema>;

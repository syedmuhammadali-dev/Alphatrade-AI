import { eq } from "drizzle-orm";
import { getDb, botConfigs, auditLogs, type BotConfigRow } from "@alphatrade/database";
import type { BotStatus } from "@alphatrade/shared-types";

export type BotAction = "start" | "pause" | "resume" | "stop" | "emergency-stop" | "reset";

/** Allowed transitions. emergency_stopped can only be cleared back to stopped, never resumed directly. */
const TRANSITIONS: Record<BotAction, { from: BotStatus[]; to: BotStatus }> = {
  start: { from: ["stopped"], to: "running" },
  pause: { from: ["running"], to: "paused" },
  resume: { from: ["paused"], to: "running" },
  stop: { from: ["running", "paused"], to: "stopped" },
  "emergency-stop": { from: ["stopped", "running", "paused"], to: "emergency_stopped" },
  reset: { from: ["emergency_stopped"], to: "stopped" },
};

export class InvalidBotTransitionError extends Error {}

export async function getBotStatusForUser(userId: string) {
  const db = getDb();
  const config = await db.query.botConfigs.findFirst({ where: eq(botConfigs.userId, userId) });

  if (!config) {
    // Should not happen post-registration, but fail safe to a stopped default.
    return { status: "stopped" as const, name: "Default Bot", updatedAt: new Date().toISOString() };
  }

  return {
    status: config.status,
    name: config.name,
    updatedAt: config.updatedAt.toISOString(),
  };
}

export async function applyBotAction(userId: string, action: BotAction): Promise<BotConfigRow> {
  const db = getDb();
  const config = await db.query.botConfigs.findFirst({ where: eq(botConfigs.userId, userId) });
  if (!config) throw new InvalidBotTransitionError("No bot configured for this user.");

  const transition = TRANSITIONS[action];
  if (!transition.from.includes(config.status)) {
    throw new InvalidBotTransitionError(`Cannot ${action} the bot while it is ${config.status}.`);
  }

  const [updated] = await db
    .update(botConfigs)
    .set({ status: transition.to, updatedAt: new Date() })
    .where(eq(botConfigs.userId, userId))
    .returning();

  await db.insert(auditLogs).values({
    userId,
    action: `bot.${action}`,
    metadata: { from: config.status, to: transition.to },
  });

  return updated!;
}

import { eq } from "drizzle-orm";
import { getDb, botConfigs } from "@alphatrade/database";

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

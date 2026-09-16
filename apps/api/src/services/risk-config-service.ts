import { eq } from "drizzle-orm";
import { getDb, botConfigs } from "@alphatrade/database";
import { riskConfigSchema, type RiskConfig } from "@alphatrade/shared-types";

/** Reads the user's risk config from bot_configs.riskConfig, filling in defaults for anything unset. */
export async function getRiskConfig(userId: string): Promise<RiskConfig> {
  const db = getDb();
  const bot = await db.query.botConfigs.findFirst({ where: eq(botConfigs.userId, userId) });
  return riskConfigSchema.parse(bot?.riskConfig ?? {});
}

export async function updateRiskConfig(userId: string, partial: Partial<RiskConfig>): Promise<RiskConfig> {
  const db = getDb();
  const current = await getRiskConfig(userId);
  const next = riskConfigSchema.parse({ ...current, ...partial });

  await db
    .update(botConfigs)
    .set({ riskConfig: next, updatedAt: new Date() })
    .where(eq(botConfigs.userId, userId));

  return next;
}

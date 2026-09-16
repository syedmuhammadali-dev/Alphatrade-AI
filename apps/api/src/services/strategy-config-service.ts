import { eq, and } from "drizzle-orm";
import { getDb, strategyConfigs } from "@alphatrade/database";
import { STRATEGIES } from "@alphatrade/strategy-engine";

/** Strategy names enabled for this user — defaults to all strategies enabled when no config row exists. */
export async function getEnabledStrategyNames(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db.query.strategyConfigs.findMany({ where: eq(strategyConfigs.userId, userId) });
  const disabled = new Set(rows.filter((r) => !r.enabled).map((r) => r.strategyName));
  return STRATEGIES.map((s) => s.name).filter((name) => !disabled.has(name));
}

export async function setStrategyEnabled(userId: string, strategyName: string, enabled: boolean): Promise<void> {
  const db = getDb();
  const existing = await db.query.strategyConfigs.findFirst({
    where: and(eq(strategyConfigs.userId, userId), eq(strategyConfigs.strategyName, strategyName)),
  });

  if (existing) {
    await db.update(strategyConfigs).set({ enabled, updatedAt: new Date() }).where(eq(strategyConfigs.id, existing.id));
  } else {
    await db.insert(strategyConfigs).values({ userId, strategyName, enabled });
  }
}

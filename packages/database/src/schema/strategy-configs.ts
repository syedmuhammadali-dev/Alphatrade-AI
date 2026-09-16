import { pgTable, uuid, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Per-user enable/disable for a strategy (identified by name — strategies
 * are code-defined in packages/strategy-engine, not user-created, so there's
 * no separate "strategies" table to join against). Confidence/risk-reward
 * gating is a Risk Engine concern (Phase 5's minimumConfidence/
 * minimumRiskReward), not a strategy config — this table stays scoped to
 * "which strategies may run at all" for a given user.
 */
export const strategyConfigs = pgTable(
  "strategy_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    strategyName: text("strategy_name").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.strategyName)],
);

export type StrategyConfigRow = typeof strategyConfigs.$inferSelect;
export type NewStrategyConfigRow = typeof strategyConfigs.$inferInsert;

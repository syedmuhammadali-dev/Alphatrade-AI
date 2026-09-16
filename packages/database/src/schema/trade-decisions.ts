import { pgTable, uuid, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const decisionSideEnum = pgEnum("decision_side", ["LONG", "SHORT", "NO_TRADE"]);

/**
 * Audit log of every computed Autonomous Decision Engine output (including
 * NO_TRADE — a valid, worth-recording outcome). Never itself an executed
 * order; execution is a separate, later stage behind the risk engine.
 */
export const tradeDecisions = pgTable("trade_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: decisionSideEnum("side").notNull(),
  strategy: text("strategy"),
  confidence: real("confidence").notNull(),
  entryPrice: real("entry_price"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  riskReward: real("risk_reward"),
  regime: text("regime").notNull(),
  reasoning: text("reasoning").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TradeDecisionRow = typeof tradeDecisions.$inferSelect;
export type NewTradeDecisionRow = typeof tradeDecisions.$inferInsert;

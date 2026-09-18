import { pgTable, uuid, text, real, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const backtestStatusEnum = pgEnum("backtest_status", ["COMPLETED", "FAILED"]);

/**
 * One row per requested backtest run. Backtests run synchronously within the
 * request (see apps/api's backtest-service) — a queued/async job runner is a
 * later concern if run times ever demand it, not built preemptively now.
 */
export const backtests = pgTable("backtests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  interval: text("interval").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  request: jsonb("request").$type<Record<string, unknown>>().notNull(),
  status: backtestStatusEnum("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BacktestRow = typeof backtests.$inferSelect;
export type NewBacktestRow = typeof backtests.$inferInsert;

/** One row per completed backtest — kept separate from `backtests` so a failed run never has dangling metrics/trades. */
export const backtestResults = pgTable("backtest_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  backtestId: uuid("backtest_id")
    .notNull()
    .unique()
    .references(() => backtests.id, { onDelete: "cascade" }),
  initialBalanceUsd: real("initial_balance_usd").notNull(),
  finalBalanceUsd: real("final_balance_usd").notNull(),
  totalReturnPercent: real("total_return_percent").notNull(),
  tradeCount: integer("trade_count").notNull(),
  wins: integer("wins").notNull(),
  losses: integer("losses").notNull(),
  winRate: real("win_rate"),
  profitFactor: real("profit_factor"),
  sharpeRatio: real("sharpe_ratio"),
  maxDrawdownPercent: real("max_drawdown_percent").notNull(),
  averageRiskReward: real("average_risk_reward"),
  trades: jsonb("trades").$type<Record<string, unknown>[]>().notNull(),
});

export type BacktestResultRow = typeof backtestResults.$inferSelect;
export type NewBacktestResultRow = typeof backtestResults.$inferInsert;

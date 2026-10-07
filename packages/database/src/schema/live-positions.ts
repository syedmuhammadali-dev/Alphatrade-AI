import { pgTable, uuid, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { exchangeConnections } from "./exchange-connections";

export const livePositionStatusEnum = pgEnum("live_position_status", ["OPEN", "CLOSED"]);
export const liveCloseReasonEnum = pgEnum("live_close_reason", ["TAKE_PROFIT", "STOP_LOSS", "MANUAL"]);

/**
 * One row per real order placed on a connected exchange account. LONG
 * (spot-style) only, same scope as paper trading (Phase 6) — margin/SHORT
 * is not implemented. Stop-loss/take-profit are not native exchange orders
 * yet (no OCO); they're enforced by polling, the same honestly-scoped
 * approach paper trading uses, now run by the bot orchestrator's tick
 * rather than left to page-load polling alone.
 */
export const livePositions = pgTable("live_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => exchangeConnections.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: text("side").notNull().default("LONG"),
  strategy: text("strategy").notNull(),
  entryPrice: real("entry_price").notNull(),
  quantity: real("quantity").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfit: real("take_profit").notNull(),
  entryOrderId: text("entry_order_id").notNull(),
  status: livePositionStatusEnum("status").notNull().default("OPEN"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closePrice: real("close_price"),
  closeReason: liveCloseReasonEnum("close_reason"),
  exitOrderId: text("exit_order_id"),
  realizedPnlUsd: real("realized_pnl_usd"),
});

export type LivePositionRow = typeof livePositions.$inferSelect;
export type NewLivePositionRow = typeof livePositions.$inferInsert;

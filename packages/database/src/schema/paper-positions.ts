import { pgTable, uuid, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const paperPositionSideEnum = pgEnum("paper_position_side", ["LONG", "SHORT"]);
export const paperPositionStatusEnum = pgEnum("paper_position_status", ["OPEN", "CLOSED"]);
export const paperCloseReasonEnum = pgEnum("paper_close_reason", ["TAKE_PROFIT", "STOP_LOSS", "MANUAL"]);

export const paperPositions = pgTable("paper_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  side: paperPositionSideEnum("side").notNull(),
  strategy: text("strategy").notNull(),
  entryPrice: real("entry_price").notNull(),
  quantity: real("quantity").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfit: real("take_profit").notNull(),
  entryFeeUsd: real("entry_fee_usd").notNull(),
  status: paperPositionStatusEnum("status").notNull().default("OPEN"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closePrice: real("close_price"),
  closeReason: paperCloseReasonEnum("close_reason"),
  exitFeeUsd: real("exit_fee_usd"),
  realizedPnlUsd: real("realized_pnl_usd"),
});

export type PaperPositionRow = typeof paperPositions.$inferSelect;
export type NewPaperPositionRow = typeof paperPositions.$inferInsert;

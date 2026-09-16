import { pgTable, uuid, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { paperPositions } from "./paper-positions";

export const paperOrderTypeEnum = pgEnum("paper_order_type", ["ENTRY", "EXIT"]);

/** Every simulated fill (entry and exit) — a append-only audit trail distinct from the mutable paper_positions row it belongs to. */
export const paperOrders = pgTable("paper_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  positionId: uuid("position_id")
    .notNull()
    .references(() => paperPositions.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  type: paperOrderTypeEnum("type").notNull(),
  quantity: real("quantity").notNull(),
  price: real("price").notNull(),
  feeUsd: real("fee_usd").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaperOrderRow = typeof paperOrders.$inferSelect;
export type NewPaperOrderRow = typeof paperOrders.$inferInsert;

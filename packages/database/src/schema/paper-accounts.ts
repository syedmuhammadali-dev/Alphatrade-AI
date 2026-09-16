import { pgTable, uuid, real, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/** One virtual-balance account per user. Never touches a real exchange. */
export const paperAccounts = pgTable("paper_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  balanceUsd: real("balance_usd").notNull(),
  startingBalanceUsd: real("starting_balance_usd").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaperAccountRow = typeof paperAccounts.$inferSelect;
export type NewPaperAccountRow = typeof paperAccounts.$inferInsert;

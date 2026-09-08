import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const botStatusEnum = pgEnum("bot_status", [
  "stopped",
  "running",
  "paused",
  "emergency_stopped",
]);

export const botConfigs = pgTable("bot_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Default Bot"),
  status: botStatusEnum("status").notNull().default("stopped"),
  riskConfig: jsonb("risk_config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BotConfigRow = typeof botConfigs.$inferSelect;
export type NewBotConfigRow = typeof botConfigs.$inferInsert;

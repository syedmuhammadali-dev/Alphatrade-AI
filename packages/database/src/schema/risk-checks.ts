import { pgTable, uuid, text, real, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const riskDecisionEnum = pgEnum("risk_decision", ["APPROVED", "REJECTED"]);

/** Audit log of every Independent Risk Engine evaluation — isolated from, and always downstream of, the AI decision layer. */
export const riskChecks = pgTable("risk_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  proposalId: text("proposal_id").notNull(),
  decision: riskDecisionEnum("decision").notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull(),
  positionSizeUnits: real("position_size_units"),
  positionSizeNotionalUsd: real("position_size_notional_usd"),
  riskConfigSnapshot: jsonb("risk_config_snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RiskCheckRow = typeof riskChecks.$inferSelect;
export type NewRiskCheckRow = typeof riskChecks.$inferInsert;

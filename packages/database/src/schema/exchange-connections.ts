import { pgTable, uuid, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const exchangeEnum = pgEnum("exchange", ["BINANCE"]);

/**
 * API key/secret are stored only as the encrypted output of
 * shared-config's encryptSecret() (AES-256-GCM, keyed by the server-only
 * ENCRYPTION_KEY) — never plaintext, never logged. `testnet` defaults to
 * true: a connection only trades against Binance's real market when a user
 * explicitly opts in.
 */
export const exchangeConnections = pgTable("exchange_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  exchange: exchangeEnum("exchange").notNull().default("BINANCE"),
  label: text("label").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  encryptedApiSecret: text("encrypted_api_secret").notNull(),
  apiKeyLast4: text("api_key_last4").notNull(),
  testnet: boolean("testnet").notNull().default(true),
  canTrade: boolean("can_trade"),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ExchangeConnectionRow = typeof exchangeConnections.$inferSelect;
export type NewExchangeConnectionRow = typeof exchangeConnections.$inferInsert;

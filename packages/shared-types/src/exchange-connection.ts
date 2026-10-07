import { z } from "zod";

export const exchangeNameSchema = z.enum(["BINANCE"]);
export type ExchangeName = z.infer<typeof exchangeNameSchema>;

export const connectExchangeRequestSchema = z.object({
  exchange: exchangeNameSchema.default("BINANCE"),
  label: z.string().min(1).max(100),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  // Defaults to true: a connection only ever touches mainnet once a user explicitly opts in.
  testnet: z.boolean().default(true),
});
export type ConnectExchangeRequest = z.infer<typeof connectExchangeRequestSchema>;

/** Never includes the decrypted (or even encrypted) key/secret — apiKeyLast4 is enough for a user to tell connections apart. */
export const exchangeConnectionSummarySchema = z.object({
  id: z.string(),
  exchange: exchangeNameSchema,
  label: z.string(),
  apiKeyLast4: z.string(),
  testnet: z.boolean(),
  canTrade: z.boolean().nullable(),
  lastVerifiedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type ExchangeConnectionSummary = z.infer<typeof exchangeConnectionSummarySchema>;

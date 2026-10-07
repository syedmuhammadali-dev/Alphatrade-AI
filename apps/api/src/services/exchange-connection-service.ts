import { eq, and } from "drizzle-orm";
import { getDb, exchangeConnections, type ExchangeConnectionRow } from "@alphatrade/database";
import { encryptSecret, decryptSecret, maskSecret } from "@alphatrade/shared-config";
import { BINANCE_TESTNET_REST_BASE_URL } from "@alphatrade/exchange-client";
import type { ConnectExchangeRequest, ExchangeConnectionSummary } from "@alphatrade/shared-types";
import { verifyConnection, ExchangeRejectedError, ExecutionEngineUnavailableError } from "./execution-engine-client";

const MAINNET_REST_BASE_URL = "https://api.binance.com";

export function restBaseUrlFor(row: Pick<ExchangeConnectionRow, "testnet">): string {
  return row.testnet ? BINANCE_TESTNET_REST_BASE_URL : MAINNET_REST_BASE_URL;
}

function toSummary(row: ExchangeConnectionRow): ExchangeConnectionSummary {
  return {
    id: row.id,
    exchange: row.exchange,
    label: row.label,
    apiKeyLast4: row.apiKeyLast4,
    testnet: row.testnet,
    canTrade: row.canTrade,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listConnections(userId: string): Promise<ExchangeConnectionSummary[]> {
  const db = getDb();
  const rows = await db.query.exchangeConnections.findMany({ where: eq(exchangeConnections.userId, userId) });
  return rows.map(toSummary);
}

/** Stores the connection immediately (encrypted), then verifies it in the background of this call so a bad key is reported, not silently stored as untested. */
export async function connectExchange(userId: string, request: ConnectExchangeRequest): Promise<ExchangeConnectionSummary> {
  const db = getDb();

  const [row] = await db
    .insert(exchangeConnections)
    .values({
      userId,
      exchange: request.exchange,
      label: request.label,
      encryptedApiKey: encryptSecret(request.apiKey),
      encryptedApiSecret: encryptSecret(request.apiSecret),
      apiKeyLast4: maskSecret(request.apiKey),
      testnet: request.testnet,
    })
    .returning();

  const verified = await verifyAndUpdate(row!);
  return toSummary(verified);
}

async function verifyAndUpdate(row: ExchangeConnectionRow): Promise<ExchangeConnectionRow> {
  const db = getDb();
  try {
    const account = await verifyConnection({
      baseUrl: restBaseUrlFor(row),
      apiKey: decryptSecret(row.encryptedApiKey),
      apiSecret: decryptSecret(row.encryptedApiSecret),
    });
    const [updated] = await db
      .update(exchangeConnections)
      .set({ canTrade: account.canTrade, lastVerifiedAt: new Date() })
      .where(eq(exchangeConnections.id, row.id))
      .returning();
    return updated!;
  } catch (err) {
    if (err instanceof ExchangeRejectedError || err instanceof ExecutionEngineUnavailableError) {
      const [updated] = await db
        .update(exchangeConnections)
        .set({ canTrade: false, lastVerifiedAt: new Date() })
        .where(eq(exchangeConnections.id, row.id))
        .returning();
      return updated!;
    }
    throw err;
  }
}

export async function testConnection(userId: string, connectionId: string): Promise<ExchangeConnectionSummary | null> {
  const db = getDb();
  const row = await db.query.exchangeConnections.findFirst({
    where: and(eq(exchangeConnections.id, connectionId), eq(exchangeConnections.userId, userId)),
  });
  if (!row) return null;
  return toSummary(await verifyAndUpdate(row));
}

export async function deleteConnection(userId: string, connectionId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(exchangeConnections)
    .where(and(eq(exchangeConnections.id, connectionId), eq(exchangeConnections.userId, userId)))
    .returning();
  return deleted.length > 0;
}

/** For internal callers (live-trading-service) that need the decrypted credentials to act on a connection. */
export async function getDecryptedConnection(userId: string, connectionId: string) {
  const db = getDb();
  const row = await db.query.exchangeConnections.findFirst({
    where: and(eq(exchangeConnections.id, connectionId), eq(exchangeConnections.userId, userId)),
  });
  if (!row) return null;
  return {
    row,
    baseUrl: restBaseUrlFor(row),
    apiKey: decryptSecret(row.encryptedApiKey),
    apiSecret: decryptSecret(row.encryptedApiSecret),
  };
}

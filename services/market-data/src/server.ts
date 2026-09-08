import { loadEnv, createLogger } from "@alphatrade/shared-config";
import { MarketDataStore } from "./store";
import { startIngest } from "./ingest";
import { buildApp } from "./app";

async function main() {
  const env = loadEnv();
  const logger = createLogger("market-data");
  const store = new MarketDataStore();

  const watchlist = env.MARKET_DATA_WATCHLIST.split(",").map((s) => s.trim()).filter(Boolean);
  const ingest = startIngest(store, { baseWsUrl: env.BINANCE_WS_BASE_URL, watchlist, logger });

  const app = await buildApp(store, env.MARKET_DATA_QUOTE_FILTER);
  await app.listen({ port: env.MARKET_DATA_PORT, host: env.MARKET_DATA_HOST });

  const shutdown = () => {
    ingest.stop();
    app.close().finally(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start market-data service:", err);
  process.exit(1);
});

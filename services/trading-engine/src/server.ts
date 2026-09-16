import { loadEnv } from "@alphatrade/shared-config";
import { buildApp } from "./app";

async function main() {
  const env = loadEnv();
  const app = await buildApp(env.ANALYSIS_ENGINE_URL, env.MARKET_DATA_URL);
  await app.listen({ port: env.TRADING_ENGINE_PORT, host: env.TRADING_ENGINE_HOST });
}

main().catch((err) => {
  console.error("Failed to start trading-engine service:", err);
  process.exit(1);
});

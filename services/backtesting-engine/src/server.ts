import { loadEnv } from "@alphatrade/shared-config";
import { buildApp } from "./app";

async function main() {
  const env = loadEnv();
  const app = await buildApp(env.BINANCE_REST_BASE_URL);
  await app.listen({ port: env.BACKTESTING_ENGINE_PORT, host: env.BACKTESTING_ENGINE_HOST });
}

main().catch((err) => {
  console.error("Failed to start backtesting-engine service:", err);
  process.exit(1);
});

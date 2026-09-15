import { loadEnv } from "@alphatrade/shared-config";
import { buildApp } from "./app";

async function main() {
  const env = loadEnv();
  const app = await buildApp(env.MARKET_DATA_URL);
  await app.listen({ port: env.ANALYSIS_ENGINE_PORT, host: env.ANALYSIS_ENGINE_HOST });
}

main().catch((err) => {
  console.error("Failed to start analysis-engine service:", err);
  process.exit(1);
});

import { loadEnv } from "@alphatrade/shared-config";
import { DeterministicRegimeDetector, type RegimeDetector } from "@alphatrade/market-analysis";
import { MlRegimeDetector } from "./ml-regime-detector";
import { buildApp } from "./app";

async function main() {
  const env = loadEnv();
  const regimeDetector: RegimeDetector =
    env.REGIME_DETECTOR_MODE === "ml" ? new MlRegimeDetector(env.ML_SERVICE_URL) : new DeterministicRegimeDetector();

  const app = await buildApp(env.MARKET_DATA_URL, regimeDetector);
  await app.listen({ port: env.ANALYSIS_ENGINE_PORT, host: env.ANALYSIS_ENGINE_HOST });
}

main().catch((err) => {
  console.error("Failed to start analysis-engine service:", err);
  process.exit(1);
});

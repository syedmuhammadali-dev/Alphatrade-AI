import { loadEnv } from "@alphatrade/shared-config";
import { buildApp } from "./app";

async function main() {
  const env = loadEnv();
  const app = await buildApp();
  await app.listen({ port: env.RISK_ENGINE_PORT, host: env.RISK_ENGINE_HOST });
}

main().catch((err) => {
  console.error("Failed to start risk-engine service:", err);
  process.exit(1);
});

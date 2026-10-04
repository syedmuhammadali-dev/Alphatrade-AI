import { loadEnv } from "@alphatrade/shared-config";
import { buildApp } from "./app";
import { startBotOrchestrator } from "./services/bot-orchestrator";

async function main() {
  const env = loadEnv();
  const app = await buildApp();

  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  startBotOrchestrator();
}

main().catch((err) => {
  console.error("Failed to start API server:", err);
  process.exit(1);
});

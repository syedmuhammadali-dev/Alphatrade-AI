import { loadEnv } from "@alphatrade/shared-config";
import { buildApp } from "./app";

async function main() {
  const env = loadEnv();
  const app = await buildApp();
  await app.listen({ port: env.EXECUTION_ENGINE_PORT, host: env.EXECUTION_ENGINE_HOST });
}

main().catch((err) => {
  console.error("Failed to start execution-engine service:", err);
  process.exit(1);
});

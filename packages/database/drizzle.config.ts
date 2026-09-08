import { defineConfig } from "drizzle-kit";
import { loadEnv } from "@alphatrade/shared-config";

const env = loadEnv();

export default defineConfig({
  schema: "./src/schema/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3010"),

  NEXT_PUBLIC_API_URL: z.string().optional(),

  ENCRYPTION_KEY: z.string().optional(),

  // services/market-data
  MARKET_DATA_PORT: z.coerce.number().int().positive().default(4100),
  MARKET_DATA_HOST: z.string().default("0.0.0.0"),
  BINANCE_WS_BASE_URL: z.string().default("wss://stream.binance.com:9443"),
  BINANCE_REST_BASE_URL: z.string().default("https://api.binance.com"),
  MARKET_DATA_WATCHLIST: z
    .string()
    .default("BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,AVAXUSDT,LINKUSDT,DOTUSDT"),
  MARKET_DATA_QUOTE_FILTER: z.string().default("USDT"),

  // apps/api -> services/market-data
  MARKET_DATA_URL: z.string().default("http://localhost:4100"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

/**
 * Validates and returns process.env against the shared schema. Throws with a
 * readable message on first use if required variables are missing/invalid,
 * so misconfiguration fails at boot rather than at some later request.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Test-only helper to reset the memoized env between test cases. */
export function __resetEnvCache(): void {
  cachedEnv = undefined;
}

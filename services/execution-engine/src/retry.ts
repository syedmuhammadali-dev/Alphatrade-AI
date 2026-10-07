import { ExchangeApiError } from "@alphatrade/exchange-client";

/**
 * Retries only on network-level failures (no `code` from the exchange —
 * meaning the request never got a real response), never on a rejection the
 * exchange actually returned (insufficient balance, invalid symbol, etc.) —
 * retrying those would be pointless at best and double-submit at worst.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable = err instanceof ExchangeApiError && err.code === undefined;
      if (!isRetryable || i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
    }
  }
  throw lastErr;
}

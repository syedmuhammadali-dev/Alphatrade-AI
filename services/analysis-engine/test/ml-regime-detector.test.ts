import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import type { Candle } from "@alphatrade/shared-types";
import { MlRegimeDetector } from "../src/ml-regime-detector";

function candle(close: number): Candle {
  return { symbol: "TEST", interval: "1h", openTime: 0, closeTime: 59, open: close, high: close + 1, low: close - 1, close, volume: 100 };
}
const SOME_CANDLES = Array.from({ length: 5 }, (_, i) => candle(100 + i));

function startFakeMlService(handler: () => unknown | { status: number; body: unknown }): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const result = handler();
      res.setHeader("content-type", "application/json");
      if (result && typeof result === "object" && "status" in result) {
        res.statusCode = (result as { status: number }).status;
        res.end(JSON.stringify((result as { body: unknown }).body));
        return;
      }
      res.end(JSON.stringify(result));
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe("MlRegimeDetector", () => {
  let server: Server;

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it("maps a high-confidence BULLISH prediction to TRENDING_BULLISH", async () => {
    const fake = await startFakeMlService(() => ({ predicted: "BULLISH", probabilities: { BULLISH: 0.8, BEARISH: 0.1, NEUTRAL: 0.1 } }));
    server = fake.server;
    const detector = new MlRegimeDetector(fake.url);
    await expect(detector.detect({ candles: SOME_CANDLES })).resolves.toBe("TRENDING_BULLISH");
  });

  it("maps a high-confidence BEARISH prediction to TRENDING_BEARISH", async () => {
    const fake = await startFakeMlService(() => ({ predicted: "BEARISH", probabilities: { BULLISH: 0.1, BEARISH: 0.8, NEUTRAL: 0.1 } }));
    server = fake.server;
    const detector = new MlRegimeDetector(fake.url);
    await expect(detector.detect({ candles: SOME_CANDLES })).resolves.toBe("TRENDING_BEARISH");
  });

  it("maps a high-confidence NEUTRAL prediction to RANGING", async () => {
    const fake = await startFakeMlService(() => ({ predicted: "NEUTRAL", probabilities: { BULLISH: 0.1, BEARISH: 0.1, NEUTRAL: 0.8 } }));
    server = fake.server;
    const detector = new MlRegimeDetector(fake.url);
    await expect(detector.detect({ candles: SOME_CANDLES })).resolves.toBe("RANGING");
  });

  it("falls back to UNCERTAIN when the prediction is too low-confidence to act on", async () => {
    const fake = await startFakeMlService(() => ({ predicted: "BULLISH", probabilities: { BULLISH: 0.4, BEARISH: 0.3, NEUTRAL: 0.3 } }));
    server = fake.server;
    const detector = new MlRegimeDetector(fake.url);
    await expect(detector.detect({ candles: SOME_CANDLES })).resolves.toBe("UNCERTAIN");
  });

  it("falls back to UNCERTAIN (never throws) when the ML service is unavailable", async () => {
    const detector = new MlRegimeDetector("http://127.0.0.1:1"); // nothing listens here
    await expect(detector.detect({ candles: SOME_CANDLES })).resolves.toBe("UNCERTAIN");
  });

  it("falls back to UNCERTAIN when the ML service errors (e.g. model not trained)", async () => {
    const fake = await startFakeMlService(() => ({ status: 503, body: { detail: "No trained model found." } }));
    server = fake.server;
    const detector = new MlRegimeDetector(fake.url);
    await expect(detector.detect({ candles: SOME_CANDLES })).resolves.toBe("UNCERTAIN");
  });
});

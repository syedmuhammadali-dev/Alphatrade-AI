import { eq } from "drizzle-orm";
import { getDb, botConfigs, livePositions } from "@alphatrade/database";
import { createLogger, loadEnv } from "@alphatrade/shared-config";
import { executePaperTrade, monitorAndAutoClose } from "./paper-trading-service";
import { monitorAndAutoCloseLive } from "./live-trading-service";

const logger = createLogger("bot-orchestrator");

/**
 * One orchestration pass. Three rules, deliberately separate:
 * 1. Protective SL/TP exits run for every paper account with open positions,
 *    whatever the bot's state — a paused, stopped, or emergency-stopped bot
 *    must not leave positions unmanaged.
 * 2. The same protective exits run for every real exchange connection with
 *    an open LIVE position, for the same reason.
 * 3. New entries (the full decision -> risk -> execute pipeline) run only
 *    for bots in the `running` state, and ONLY against paper trading. The
 *    autonomous bot never opens a real-money position on its own — live
 *    trades are deliberately manual-only (POST /live/execute), a safety
 *    choice, not a gap to close later.
 */
export async function runBotTick(symbols: string[]): Promise<void> {
  const db = getDb();

  const accounts = await db.query.paperAccounts.findMany({ columns: { userId: true } });
  for (const { userId } of accounts) {
    try {
      await monitorAndAutoClose(userId);
    } catch (err) {
      logger.warn({ err, userId }, "Position monitoring failed for account");
    }
  }

  const liveUserIds = new Set(
    (await db.query.livePositions.findMany({ where: eq(livePositions.status, "OPEN"), columns: { userId: true } })).map(
      (p) => p.userId,
    ),
  );
  for (const userId of liveUserIds) {
    try {
      await monitorAndAutoCloseLive(userId);
    } catch (err) {
      logger.warn({ err, userId }, "Live position monitoring failed for account");
    }
  }

  const running = await db.query.botConfigs.findMany({ where: eq(botConfigs.status, "running") });
  for (const bot of running) {
    for (const symbol of symbols) {
      try {
        const result = await executePaperTrade(bot.userId, symbol);
        if (result.executed) logger.info({ userId: bot.userId, symbol }, "Bot opened a paper position");
      } catch (err) {
        logger.warn({ err, userId: bot.userId, symbol }, "Bot tick failed for symbol");
      }
    }
  }
}

let timer: NodeJS.Timeout | undefined;
let ticking = false;

/** Starts the recurring tick. Overlapping ticks are skipped rather than queued. */
export function startBotOrchestrator(): void {
  if (timer) return;
  const env = loadEnv();
  const symbols = env.MARKET_DATA_WATCHLIST.split(",").map((s) => s.trim()).filter(Boolean);

  timer = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await runBotTick(symbols);
    } catch (err) {
      logger.error({ err }, "Bot orchestration tick failed");
    } finally {
      ticking = false;
    }
  }, env.BOT_TICK_INTERVAL_MS);
}

export function stopBotOrchestrator(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}

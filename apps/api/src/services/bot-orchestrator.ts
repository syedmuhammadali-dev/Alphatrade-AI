import { eq } from "drizzle-orm";
import { getDb, botConfigs } from "@alphatrade/database";
import { createLogger, loadEnv } from "@alphatrade/shared-config";
import { executePaperTrade, monitorAndAutoClose } from "./paper-trading-service";

const logger = createLogger("bot-orchestrator");

/**
 * One orchestration pass. Two rules, deliberately separate:
 * 1. Protective SL/TP exits run for every paper account with open positions,
 *    whatever the bot's state — a paused, stopped, or emergency-stopped bot
 *    must not leave positions unmanaged.
 * 2. New entries (the full decision -> risk -> execute pipeline) run only for
 *    bots in the `running` state. Pause/stop/emergency-stop all block entries.
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

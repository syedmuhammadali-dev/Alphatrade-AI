import type { Candle } from "@alphatrade/shared-types";
import type { BacktestResult, BacktestTrade, BacktestCloseReason, AccountState } from "@alphatrade/shared-types";
import { riskConfigSchema, accountStateSchema } from "@alphatrade/shared-types";
import { analyze, detectStructure, DeterministicRegimeDetector } from "@alphatrade/market-analysis";
import { STRATEGIES, runAllStrategies, selectBestSignal, buildProposal, noTradeSignal } from "@alphatrade/strategy-engine";
import { evaluateProposal } from "@alphatrade/risk-engine";
import { TAKER_FEE_RATE, computeFee, computeRealizedPnl } from "@alphatrade/trade-executor";
import type { BacktestSimConfig, OpenSimPosition } from "./types";
import { computeMetrics } from "./metrics";

const MIN_CANDLES_FOR_ANALYSIS = 30;
const regimeDetector = new DeterministicRegimeDetector();

function applyThresholds(signal: ReturnType<typeof selectBestSignal>, minConfidence: number, minRiskReward: number) {
  if (signal.action === "NO_TRADE") return signal;
  if (signal.confidence < minConfidence) {
    return noTradeSignal(signal.strategyName, `Confidence ${signal.confidence}% below the configured minimum of ${minConfidence}%.`);
  }
  if (signal.riskReward !== null && signal.riskReward < minRiskReward) {
    return noTradeSignal(signal.strategyName, `Risk/reward ${signal.riskReward.toFixed(2)} below the configured minimum of ${minRiskReward}.`);
  }
  return signal;
}

function currentLosingStreak(trades: BacktestTrade[]): number {
  let streak = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i]!.realizedPnlUsd < 0) streak++;
    else break;
  }
  return streak;
}

function dailyPnlPercent(trades: BacktestTrade[], asOfIso: string, initialBalanceUsd: number): number {
  const day = asOfIso.slice(0, 10);
  const todaysPnl = trades.filter((t) => t.exitTime.slice(0, 10) === day).reduce((sum, t) => sum + t.realizedPnlUsd, 0);
  return (todaysPnl / initialBalanceUsd) * 100;
}

function buildTrade(
  position: OpenSimPosition,
  symbol: string,
  exitTime: string,
  exitPrice: number,
  closeReason: BacktestCloseReason,
): BacktestTrade {
  const exitFeeUsd = computeFee(exitPrice * position.quantity, TAKER_FEE_RATE);
  const realizedPnlUsd = computeRealizedPnl(
    "LONG",
    position.entryPrice,
    exitPrice,
    position.quantity,
    position.entryFeeUsd,
    exitFeeUsd,
  );
  const riskAmountUsd = (position.entryPrice - position.stopLoss) * position.quantity;

  return {
    symbol,
    side: "LONG",
    strategy: position.strategy,
    entryTime: position.entryTime,
    entryPrice: position.entryPrice,
    exitTime,
    exitPrice,
    quantity: position.quantity,
    stopLoss: position.stopLoss,
    takeProfit: position.takeProfit,
    closeReason,
    entryFeeUsd: position.entryFeeUsd,
    exitFeeUsd,
    realizedPnlUsd,
    realizedRiskReward: riskAmountUsd > 0 ? realizedPnlUsd / riskAmountUsd : null,
  };
}

/**
 * Walk-forward replay: at each closed bar, either manages the one open
 * position (checked against that bar's high/low, stop-loss taking priority
 * over take-profit as the conservative assumption when both would trigger
 * within the same bar) or looks for a new entry using only data up to and
 * including that bar. A new position always fills at the *next* bar's open
 * (never the signal bar's own price) to avoid lookahead bias. LONG-only,
 * one position at a time — the same scope paper trading (Phase 6) chose.
 */
export function runBacktest(candles: Candle[], config: BacktestSimConfig): BacktestResult {
  const strategies = config.strategies ? STRATEGIES.filter((s) => config.strategies!.includes(s.name)) : STRATEGIES;
  const riskConfig = riskConfigSchema.parse({
    ...config.riskConfig,
    accountBalanceUsd: config.initialBalanceUsd,
    minimumConfidence: config.minConfidence,
    minimumRiskReward: config.minRiskReward,
  });

  let balance = config.initialBalanceUsd;
  let openPosition: OpenSimPosition | null = null;
  const trades: BacktestTrade[] = [];

  for (let i = MIN_CANDLES_FOR_ANALYSIS; i < candles.length; i++) {
    const bar = candles[i]!;
    const barTime = new Date(bar.closeTime).toISOString();

    if (openPosition) {
      let exit: { price: number; reason: BacktestCloseReason } | null = null;
      if (bar.low <= openPosition.stopLoss) {
        exit = { price: openPosition.stopLoss, reason: "STOP_LOSS" };
      } else if (bar.high >= openPosition.takeProfit) {
        exit = { price: openPosition.takeProfit, reason: "TAKE_PROFIT" };
      }

      if (exit) {
        const trade = buildTrade(openPosition, config.symbol, barTime, exit.price, exit.reason);
        balance += exit.price * openPosition.quantity - trade.exitFeeUsd;
        trades.push(trade);
        openPosition = null;
      }
      continue;
    }

    if (i + 1 >= candles.length) continue; // no next bar left to fill an entry at

    const windowCandles = candles.slice(0, i + 1);
    const analysis = analyze(config.symbol, config.interval, windowCandles);
    const structure = detectStructure(windowCandles);
    const regime = regimeDetector.detect({ candles: windowCandles });

    const signals = runAllStrategies({ symbol: config.symbol, analysis, structure, regime }, strategies);
    const best = applyThresholds(selectBestSignal(signals), config.minConfidence, config.minRiskReward);
    const proposal = buildProposal(config.symbol, best, regime);
    if (!proposal || proposal.side !== "LONG") continue;

    const accountState: AccountState = accountStateSchema.parse({
      openPositionsCount: 0,
      currentExposurePercent: 0,
      dailyPnlPercent: dailyPnlPercent(trades, barTime, config.initialBalanceUsd),
      currentLosingStreak: currentLosingStreak(trades),
    });
    const riskCheck = evaluateProposal(proposal, riskConfig, accountState);
    if (riskCheck.decision !== "APPROVED" || !riskCheck.positionSize) continue;

    const fillBar = candles[i + 1]!;
    const entryPrice = fillBar.open;
    const quantity = riskCheck.positionSize.notionalValueUsd / entryPrice;
    const entryFeeUsd = computeFee(quantity * entryPrice, TAKER_FEE_RATE);
    const cost = quantity * entryPrice + entryFeeUsd;
    if (cost > balance) continue;

    balance -= cost;
    openPosition = {
      strategy: proposal.strategy,
      entryTime: new Date(fillBar.closeTime).toISOString(),
      entryPrice,
      quantity,
      stopLoss: proposal.stopLoss,
      takeProfit: proposal.takeProfit,
      entryFeeUsd,
    };
    i++; // the fill bar was already consumed as the entry; don't re-check it as an exit bar too
  }

  if (openPosition) {
    const lastBar = candles[candles.length - 1]!;
    const trade = buildTrade(openPosition, config.symbol, new Date(lastBar.closeTime).toISOString(), lastBar.close, "END_OF_BACKTEST");
    balance += lastBar.close * openPosition.quantity - trade.exitFeeUsd;
    trades.push(trade);
  }

  return { metrics: computeMetrics(trades, config.initialBalanceUsd, balance), trades };
}

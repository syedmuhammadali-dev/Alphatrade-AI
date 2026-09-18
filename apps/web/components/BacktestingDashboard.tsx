"use client";

import { useCallback, useEffect, useState } from "react";
import type { BacktestSummary, BacktestDetail, BacktestInterval } from "@alphatrade/shared-types";
import { Card, Badge, Button, StatTile } from "@alphatrade/ui";

const STRATEGY_NAMES = ["TrendFollowingStrategy", "BreakoutStrategy", "MomentumStrategy", "MeanReversionStrategy"];
const INTERVALS: BacktestInterval[] = ["15m", "1h", "4h", "1d"];

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultDates() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function fmtUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function fmtPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function BacktestingDashboard() {
  const [history, setHistory] = useState<BacktestSummary[]>([]);
  const [selected, setSelected] = useState<BacktestDetail | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startDate, endDate } = defaultDates();
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setCandleInterval] = useState<BacktestInterval>("1h");
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const [initialBalanceUsd, setInitialBalanceUsd] = useState(10_000);
  const [minConfidence, setMinConfidence] = useState(60);
  const [minRiskReward, setMinRiskReward] = useState(1.5);
  const [strategies, setStrategies] = useState<string[]>(STRATEGY_NAMES);

  const refreshHistory = useCallback(async () => {
    const res = await fetch("/api/backtests");
    if (res.ok) setHistory((await res.json()).backtests);
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  function toggleStrategy(name: string) {
    setStrategies((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));
  }

  async function handleRun(event: React.FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/backtests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          interval,
          startDate: new Date(`${start}T00:00:00.000Z`).toISOString(),
          endDate: new Date(`${end}T00:00:00.000Z`).toISOString(),
          strategies: strategies.length > 0 ? strategies : undefined,
          initialBalanceUsd,
          minConfidence,
          minRiskReward,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Backtest failed to run.");
        return;
      }
      setSelected(body);
      await refreshHistory();
    } finally {
      setRunning(false);
    }
  }

  async function viewBacktest(id: string) {
    const res = await fetch(`/api/backtests/${id}`);
    if (res.ok) setSelected(await res.json());
  }

  return (
    <div className="flex flex-col gap-gutter-terminal">
      <Card>
        <div className="mb-space-base">
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">New Backtest</span>
          <p className="font-body-sm text-body-sm text-outline mt-space-xs">
            Replays historical candles fetched directly from Binance through the exact same strategy engine and
            independent risk engine used live — LONG-only, one position at a time, the same scope paper trading
            uses. A new position always fills at the next bar&rsquo;s open to avoid lookahead bias.
          </p>
        </div>

        <form onSubmit={handleRun} className="grid grid-cols-1 md:grid-cols-3 gap-space-base">
          <div className="flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Symbol</label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Interval</label>
            <select
              value={interval}
              onChange={(e) => setCandleInterval(e.target.value as BacktestInterval)}
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            >
              {INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">
              Initial Balance (USD)
            </label>
            <input
              type="number"
              value={initialBalanceUsd}
              onChange={(e) => setInitialBalanceUsd(Number(e.target.value))}
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Start Date</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">End Date</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-space-base">
            <div className="flex flex-col gap-space-2xs">
              <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Min Confidence</label>
              <input
                type="number"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-space-2xs">
              <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Min R:R</label>
              <input
                type="number"
                step="0.1"
                value={minRiskReward}
                onChange={(e) => setMinRiskReward(Number(e.target.value))}
                className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col gap-space-2xs">
            <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Strategies</label>
            <div className="flex flex-wrap gap-space-sm">
              {STRATEGY_NAMES.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => toggleStrategy(name)}
                  className={`px-space-sm py-1 rounded font-label-caps text-label-caps uppercase transition-colors ${
                    strategies.includes(name)
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-surface-container-low text-outline border border-white/10"
                  }`}
                >
                  {name.replace("Strategy", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 flex items-center gap-space-sm pt-space-sm">
            <Button type="submit" variant="primary" disabled={running}>
              {running ? "Running…" : "Run Backtest"}
            </Button>
            {error && <span className="font-label-caps text-label-caps text-error">{error}</span>}
          </div>
        </form>
      </Card>

      {selected && (
        <Card>
          <div className="flex items-center justify-between mb-space-base">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              {selected.symbol} · {selected.interval} · {selected.startDate.slice(0, 10)} → {selected.endDate.slice(0, 10)}
            </span>
            <Badge tone={selected.status === "COMPLETED" ? "positive" : "negative"}>{selected.status}</Badge>
          </div>

          {selected.status === "FAILED" && (
            <p className="font-body-sm text-body-sm text-error">{selected.errorMessage}</p>
          )}

          {selected.metrics && (
            <>
              <section className="grid grid-cols-2 md:grid-cols-4 gap-gutter-terminal mb-space-base">
                <StatTile
                  label="Total Return"
                  value={fmtPercent(selected.metrics.totalReturnPercent)}
                  valueClassName={selected.metrics.totalReturnPercent >= 0 ? "text-secondary" : "text-error"}
                />
                <StatTile
                  label="Win Rate"
                  value={selected.metrics.winRate != null ? `${selected.metrics.winRate.toFixed(0)}%` : "—"}
                />
                <StatTile
                  label="Profit Factor"
                  value={selected.metrics.profitFactor != null ? selected.metrics.profitFactor.toFixed(2) : "—"}
                />
                <StatTile label="Max Drawdown" value={`${selected.metrics.maxDrawdownPercent.toFixed(2)}%`} />
                <StatTile label="Trades" value={String(selected.metrics.tradeCount)} />
                <StatTile label="Sharpe" value={selected.metrics.sharpeRatio != null ? selected.metrics.sharpeRatio.toFixed(2) : "—"} />
                <StatTile
                  label="Avg R:R"
                  value={selected.metrics.averageRiskReward != null ? selected.metrics.averageRiskReward.toFixed(2) : "—"}
                />
                <StatTile label="Final Balance" value={`$${selected.metrics.finalBalanceUsd.toFixed(2)}`} />
              </section>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-body-sm text-body-sm">
                  <thead>
                    <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                      <th className="py-2 px-space-sm font-semibold">Strategy</th>
                      <th className="py-2 px-space-sm font-semibold">Entry → Exit</th>
                      <th className="py-2 px-space-sm font-semibold text-right">Entry / Exit Price</th>
                      <th className="py-2 px-space-sm font-semibold">Close Reason</th>
                      <th className="py-2 px-space-sm font-semibold text-right">Realized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {selected.trades.map((t, i) => (
                      <tr key={i}>
                        <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
                          {t.strategy}
                        </td>
                        <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-outline">
                          {new Date(t.entryTime).toLocaleString()} → {new Date(t.exitTime).toLocaleString()}
                        </td>
                        <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                          {t.entryPrice.toFixed(4)} / {t.exitPrice.toFixed(4)}
                        </td>
                        <td className="py-space-sm px-space-sm">
                          <Badge tone={t.closeReason === "STOP_LOSS" ? "negative" : t.closeReason === "TAKE_PROFIT" ? "positive" : "neutral"}>
                            {t.closeReason}
                          </Badge>
                        </td>
                        <td
                          className={`py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm font-semibold ${
                            t.realizedPnlUsd >= 0 ? "text-secondary" : "text-error"
                          }`}
                        >
                          {fmtUsd(t.realizedPnlUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selected.trades.length === 0 && (
                  <p className="font-body-sm text-body-sm text-outline py-space-base">
                    No trades were taken over this range — a legitimate outcome, not a bug.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-space-xs mb-space-base">
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Backtest History</span>
          <Badge tone="neutral">{history.length}</Badge>
        </div>
        {history.length === 0 ? (
          <p className="font-body-sm text-body-sm text-outline">No backtests run yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                  <th className="py-2 px-space-sm font-semibold">Symbol</th>
                  <th className="py-2 px-space-sm font-semibold">Interval</th>
                  <th className="py-2 px-space-sm font-semibold">Range</th>
                  <th className="py-2 px-space-sm font-semibold">Status</th>
                  <th className="py-2 px-space-sm font-semibold text-right">Return</th>
                  <th className="py-2 px-space-sm font-semibold text-right">Win Rate</th>
                  <th className="py-2 px-space-sm font-semibold text-right">Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {history.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => viewBacktest(b.id)}
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  >
                    <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">
                      {b.symbol}
                    </td>
                    <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-outline">{b.interval}</td>
                    <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-outline">
                      {b.startDate.slice(0, 10)} → {b.endDate.slice(0, 10)}
                    </td>
                    <td className="py-space-sm px-space-sm">
                      <Badge tone={b.status === "COMPLETED" ? "positive" : "negative"}>{b.status}</Badge>
                    </td>
                    <td
                      className={`py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm font-semibold ${
                        (b.totalReturnPercent ?? 0) >= 0 ? "text-secondary" : "text-error"
                      }`}
                    >
                      {fmtPercent(b.totalReturnPercent)}
                    </td>
                    <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                      {b.winRate != null ? `${b.winRate.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                      {b.tradeCount ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

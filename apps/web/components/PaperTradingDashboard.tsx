"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaperAccount, PaperPosition, PaperPerformance } from "@alphatrade/shared-types";
import { Card, Badge, Button, StatTile } from "@alphatrade/ui";

const POLL_INTERVAL_MS = 10_000;

function fmtUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export function PaperTradingDashboard() {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [trades, setTrades] = useState<PaperPosition[]>([]);
  const [performance, setPerformance] = useState<PaperPerformance | null>(null);
  const [starting, setStarting] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const accountRes = await fetch("/api/paper/account");
    if (accountRes.status === 404) {
      setAccountExists(false);
      setAccount(null);
      return;
    }
    if (accountRes.ok) {
      setAccountExists(true);
      setAccount(await accountRes.json());
    }

    const [positionsRes, tradesRes, performanceRes] = await Promise.all([
      fetch("/api/paper/positions"),
      fetch("/api/paper/trades"),
      fetch("/api/paper/performance"),
    ]);
    if (positionsRes.ok) setPositions((await positionsRes.json()).positions);
    if (tradesRes.ok) setTrades((await tradesRes.json()).trades);
    if (performanceRes.ok) setPerformance(await performanceRes.json());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch("/api/paper/start", { method: "POST" });
      if (res.ok) await refresh();
    } finally {
      setStarting(false);
    }
  }

  async function handleClose(positionId: string) {
    setClosingId(positionId);
    try {
      const res = await fetch(`/api/paper/positions/${positionId}/close`, { method: "POST" });
      if (res.ok) await refresh();
    } finally {
      setClosingId(null);
    }
  }

  if (accountExists === false) {
    return (
      <Card className="flex flex-col items-center text-center gap-space-base py-space-2xl">
        <span className="font-headline-md text-headline-md text-on-surface font-semibold">
          Start Paper Trading
        </span>
        <p className="font-body-md text-body-md text-outline max-w-md">
          A simulated account with a virtual $10,000 balance. Trades execute at live Binance market prices,
          with realistic fees — but no real money and no exchange account are ever involved. Every position
          still goes through the exact same Risk Engine as any future live trade would.
        </p>
        <Button variant="primary" onClick={handleStart} disabled={starting}>
          {starting ? "Starting…" : "Start with $10,000 (virtual)"}
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-gutter-terminal">
      {account && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter-terminal">
          <StatTile label="Virtual Balance" value={`$${account.balanceUsd.toFixed(2)}`} unit="USD" />
          <StatTile
            label="Equity (incl. unrealized)"
            value={`$${account.equityUsd.toFixed(2)}`}
            unit="USD"
            valueClassName={account.equityUsd >= account.startingBalanceUsd ? "text-secondary" : "text-error"}
          />
          <StatTile
            label="Total P&L"
            value={fmtUsd(account.equityUsd - account.startingBalanceUsd)}
            unit="USD"
            valueClassName={account.equityUsd >= account.startingBalanceUsd ? "text-secondary" : "text-error"}
          />
          <StatTile label="Open Positions" value={String(account.openPositionsCount)} />
        </section>
      )}

      <Card>
        <div className="flex items-center gap-space-xs mb-space-base">
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Open Positions</span>
          <Badge tone="neutral">{positions.length}</Badge>
        </div>
        {positions.length === 0 ? (
          <p className="font-body-sm text-body-sm text-outline">
            No open paper positions. Approve a trade from the AI Decisions page to open one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                  <th className="py-2.5 px-space-sm font-semibold">Symbol</th>
                  <th className="py-2.5 px-space-sm font-semibold">Strategy</th>
                  <th className="py-2.5 px-space-sm font-semibold text-right">Entry / Current</th>
                  <th className="py-2.5 px-space-sm font-semibold text-right">SL / TP</th>
                  <th className="py-2.5 px-space-sm font-semibold text-right">Unrealized P&amp;L</th>
                  <th className="py-2.5 px-space-sm font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {positions.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">
                      {p.symbol}
                    </td>
                    <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
                      {p.strategy}
                    </td>
                    <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm">
                      <span className="text-outline">{p.entryPrice.toFixed(4)}</span>
                      <span className="block text-on-surface font-semibold">{p.currentPrice?.toFixed(4) ?? "—"}</span>
                    </td>
                    <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                      {p.stopLoss.toFixed(4)} / {p.takeProfit.toFixed(4)}
                    </td>
                    <td
                      className={`py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm font-semibold ${
                        (p.unrealizedPnlUsd ?? 0) >= 0 ? "text-secondary" : "text-error"
                      }`}
                    >
                      {p.unrealizedPnlUsd != null ? fmtUsd(p.unrealizedPnlUsd) : "—"}
                    </td>
                    <td className="py-space-sm px-space-sm text-center">
                      <button
                        onClick={() => handleClose(p.id)}
                        disabled={closingId === p.id}
                        className="px-2 py-1 bg-error/10 hover:bg-error/20 text-error rounded font-label-caps text-label-caps uppercase transition-colors disabled:opacity-50"
                      >
                        {closingId === p.id ? "Closing…" : "Close"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-terminal items-start">
        <div className="xl:col-span-8">
          <Card>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Trade History</span>
            {trades.length === 0 ? (
              <p className="font-body-sm text-body-sm text-outline mt-space-sm">No closed trades yet.</p>
            ) : (
              <div className="overflow-x-auto mt-space-base">
                <table className="w-full text-left font-body-sm text-body-sm">
                  <thead>
                    <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                      <th className="py-2 px-space-sm font-semibold">Symbol</th>
                      <th className="py-2 px-space-sm font-semibold">Closed</th>
                      <th className="py-2 px-space-sm font-semibold text-right">Entry / Exit</th>
                      <th className="py-2 px-space-sm font-semibold text-right">Realized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {trades.map((t) => (
                      <tr key={t.id}>
                        <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface">
                          {t.symbol}
                        </td>
                        <td className="py-space-sm px-space-sm">
                          <Badge tone={t.closeReason === "STOP_LOSS" ? "negative" : t.closeReason === "TAKE_PROFIT" ? "positive" : "neutral"}>
                            {t.closeReason}
                          </Badge>
                        </td>
                        <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                          {t.entryPrice.toFixed(4)} / {t.closePrice?.toFixed(4) ?? "—"}
                        </td>
                        <td
                          className={`py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm font-semibold ${
                            (t.realizedPnlUsd ?? 0) >= 0 ? "text-secondary" : "text-error"
                          }`}
                        >
                          {t.realizedPnlUsd != null ? fmtUsd(t.realizedPnlUsd) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="xl:col-span-4">
          <Card>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Performance</span>
            {performance && (
              <div className="mt-space-base space-y-space-sm font-label-numeric-sm text-label-numeric-sm">
                <div className="flex justify-between">
                  <span className="text-outline uppercase font-label-caps text-label-caps">Total Trades</span>
                  <span className="text-on-surface">{performance.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline uppercase font-label-caps text-label-caps">Win Rate</span>
                  <span className="text-on-surface">{performance.winRate != null ? `${performance.winRate.toFixed(0)}%` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline uppercase font-label-caps text-label-caps">Profit Factor</span>
                  <span className="text-on-surface">{performance.profitFactor != null ? performance.profitFactor.toFixed(2) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline uppercase font-label-caps text-label-caps">Total P&amp;L</span>
                  <span className={performance.totalPnlUsd >= 0 ? "text-secondary" : "text-error"}>
                    {fmtUsd(performance.totalPnlUsd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline uppercase font-label-caps text-label-caps">Total Fees</span>
                  <span className="text-outline">${performance.totalFeesUsd.toFixed(2)}</span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

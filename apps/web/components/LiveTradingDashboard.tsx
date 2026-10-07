"use client";

import { useCallback, useEffect, useState } from "react";
import type { LivePosition, ExchangeConnectionSummary } from "@alphatrade/shared-types";
import { Card, Badge, Button } from "@alphatrade/ui";

const POLL_INTERVAL_MS = 10_000;

function fmtUsd(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

export function LiveTradingDashboard() {
  const [connections, setConnections] = useState<ExchangeConnectionSummary[]>([]);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [trades, setTrades] = useState<LivePosition[]>([]);
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [connectionId, setConnectionId] = useState("");
  const [executing, setExecuting] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [connRes, posRes, tradesRes] = await Promise.all([
      fetch("/api/exchange-connections"),
      fetch("/api/live/positions"),
      fetch("/api/live/trades"),
    ]);
    if (connRes.ok) {
      const conns = (await connRes.json()).connections as ExchangeConnectionSummary[];
      setConnections(conns);
      if (!connectionId && conns.length > 0) setConnectionId(conns[0]!.id);
    }
    if (posRes.ok) setPositions((await posRes.json()).positions);
    if (tradesRes.ok) setTrades((await tradesRes.json()).trades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleExecute() {
    if (!connectionId) {
      setMessage("Connect an exchange first.");
      return;
    }
    setExecuting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/live/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), connectionId }),
      });
      const body = await res.json();
      setMessage(body.reason);
      if (body.executed) await refresh();
    } finally {
      setExecuting(false);
    }
  }

  async function handleClose(positionId: string) {
    setClosingId(positionId);
    try {
      const res = await fetch(`/api/live/positions/${positionId}/close`, { method: "POST" });
      if (res.ok) await refresh();
    } finally {
      setClosingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-gutter-terminal">
      <Card className="border border-error/30">
        <div className="flex items-center gap-space-xs mb-space-xs">
          <span className="material-symbols-outlined text-error text-lg">emergency_home</span>
          <span className="font-label-caps text-label-caps uppercase text-error tracking-wider">This places real orders</span>
        </div>
        <p className="font-body-sm text-body-sm text-outline">
          Every execution here re-runs the full AI Decision + independent Risk Engine check before placing a real
          market order through your connected exchange account. The autonomous bot never trades live on its
          own — this is always a manual, one-click action. LONG (spot-style) only.
        </p>
      </Card>

      {connections.length === 0 ? (
        <Card className="flex flex-col items-center text-center gap-space-base py-space-2xl">
          <span className="font-headline-md text-headline-md text-on-surface font-semibold">No Exchange Connected</span>
          <p className="font-body-sm text-body-sm text-outline max-w-md">
            Add an exchange connection on the Exchange Connections page before you can trade live.
          </p>
        </Card>
      ) : (
        <Card>
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Execute Live Trade</span>
          <div className="flex flex-wrap items-end gap-space-base mt-space-base">
            <div className="flex flex-col gap-space-2xs">
              <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Symbol</label>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-space-2xs">
              <label className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Connection</label>
              <select
                value={connectionId}
                onChange={(e) => setConnectionId(e.target.value)}
                className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} {c.testnet ? "(testnet)" : "(MAINNET)"}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="danger" disabled={executing} onClick={handleExecute}>
              {executing ? "Executing…" : "Execute Live Trade"}
            </Button>
            {message && <span className="font-label-caps text-label-caps text-outline">{message}</span>}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-space-xs mb-space-base">
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Open Live Positions</span>
          <Badge tone="neutral">{positions.length}</Badge>
        </div>
        {positions.length === 0 ? (
          <p className="font-body-sm text-body-sm text-outline">No open live positions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                  <th className="py-2.5 px-space-sm font-semibold">Symbol</th>
                  <th className="py-2.5 px-space-sm font-semibold text-right">Entry / Current</th>
                  <th className="py-2.5 px-space-sm font-semibold text-right">SL / TP</th>
                  <th className="py-2.5 px-space-sm font-semibold text-right">Unrealized P&amp;L</th>
                  <th className="py-2.5 px-space-sm font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {positions.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">{p.symbol}</td>
                    <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm">
                      <span className="text-outline">{p.entryPrice.toFixed(4)}</span>
                      <span className="block text-on-surface font-semibold">{p.currentPrice?.toFixed(4) ?? "—"}</span>
                    </td>
                    <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                      {p.stopLoss.toFixed(4)} / {p.takeProfit.toFixed(4)}
                    </td>
                    <td className={`py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm font-semibold ${(p.unrealizedPnlUsd ?? 0) >= 0 ? "text-secondary" : "text-error"}`}>
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

      <Card>
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Trade History</span>
        {trades.length === 0 ? (
          <p className="font-body-sm text-body-sm text-outline mt-space-sm">No closed live trades yet.</p>
        ) : (
          <div className="overflow-x-auto mt-space-base">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                  <th className="py-2 px-space-sm font-semibold">Symbol</th>
                  <th className="py-2 px-space-sm font-semibold">Closed</th>
                  <th className="py-2 px-space-sm font-semibold text-right">Entry / Exit</th>
                  <th className="py-2 px-space-sm font-semibold text-right">Gross P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {trades.map((t) => (
                  <tr key={t.id}>
                    <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface">{t.symbol}</td>
                    <td className="py-space-sm px-space-sm">
                      <Badge tone={t.closeReason === "STOP_LOSS" ? "negative" : t.closeReason === "TAKE_PROFIT" ? "positive" : "neutral"}>
                        {t.closeReason}
                      </Badge>
                    </td>
                    <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                      {t.entryPrice.toFixed(4)} / {t.closePrice?.toFixed(4) ?? "—"}
                    </td>
                    <td className={`py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm font-semibold ${(t.realizedPnlUsd ?? 0) >= 0 ? "text-secondary" : "text-error"}`}>
                      {t.realizedPnlUsd != null ? fmtUsd(t.realizedPnlUsd) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-body-sm text-body-sm text-outline mt-space-sm">
              &ldquo;Gross P&amp;L&rdquo; does not net out the exchange&rsquo;s own trading commission yet.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

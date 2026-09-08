"use client";

import { useEffect, useState } from "react";
import type { ScannerResponse } from "@alphatrade/shared-types";
import { Badge } from "@alphatrade/ui";

const POLL_INTERVAL_MS = 5_000;

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`;
  return volume.toFixed(2);
}

export function ScannerTable({ initial }: { initial: ScannerResponse }) {
  const [data, setData] = useState<ScannerResponse>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/market/scanner?limit=50");
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body: ScannerResponse = await res.json();
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Live feed temporarily unavailable — showing last known snapshot.");
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="bg-surface-container-lowest rounded shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-base border-b border-outline-variant/20">
        <div>
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Market Scanner
            </span>
            <Badge tone="positive">{data.count} PAIRS</Badge>
          </div>
          <p className="font-body-sm text-body-sm text-outline mt-0.5">
            Live Binance USDT pairs, ranked by 24h quote volume. Updates every 5s.
          </p>
        </div>
        <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
          Updated {new Date(data.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      {error && (
        <div className="px-space-base py-space-xs bg-tertiary/10 text-tertiary font-body-sm text-body-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left font-body-sm text-body-sm">
          <thead>
            <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
              <th className="py-2.5 px-space-sm font-semibold">#</th>
              <th className="py-2.5 px-space-sm font-semibold">Symbol</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">Last Price</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">24h Change</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">24h High</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">24h Low</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">Quote Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {data.entries.map((entry) => {
              const positive = entry.priceChangePercent >= 0;
              return (
                <tr key={entry.symbol} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-outline">
                    {entry.rank}
                  </td>
                  <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">
                    {entry.symbol}
                  </td>
                  <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-on-surface">
                    ${formatPrice(entry.lastPrice)}
                  </td>
                  <td
                    className={`py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm font-semibold ${
                      positive ? "text-secondary" : "text-error"
                    }`}
                  >
                    {positive ? "+" : ""}
                    {entry.priceChangePercent.toFixed(2)}%
                  </td>
                  <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                    ${formatPrice(entry.highPrice)}
                  </td>
                  <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                    ${formatPrice(entry.lowPrice)}
                  </td>
                  <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-on-surface">
                    ${formatVolume(entry.quoteVolume)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OpportunitiesResponse } from "@alphatrade/shared-types";
import { Badge } from "@alphatrade/ui";

const POLL_INTERVAL_MS = 15_000;

const ACTION_TONE = {
  LONG: "positive",
  SHORT: "negative",
  NO_TRADE: "neutral",
} as const;

function fmt(value: number | null | undefined, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

export function DecisionsTable({ initial }: { initial: OpportunitiesResponse }) {
  const [data, setData] = useState<OpportunitiesResponse>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function poll() {
    setLoading(true);
    try {
      const res = await fetch("/api/decisions");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body: OpportunitiesResponse = await res.json();
      setData(body);
      setError(null);
    } catch {
      setError("AI decision engine temporarily unavailable — showing last known snapshot.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const actionable = data.opportunities.filter((o) => o.action !== "NO_TRADE");

  return (
    <div className="bg-surface-container-lowest rounded shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-space-sm p-space-base border-b border-outline-variant/20">
        <div>
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">AI Decisions</span>
            <Badge tone="positive">{actionable.length} ACTIONABLE</Badge>
            <Badge tone="neutral">{data.opportunities.length} SCANNED</Badge>
          </div>
          <p className="font-body-sm text-body-sm text-outline mt-0.5">
            Ranked by the Opportunity Ranker across trend strength, structure, volume, liquidity, and strategy
            confidence. Each actionable proposal is separately evaluated by the Independent Risk Engine — see the
            Risk column. NO_TRADE is a valid outcome. Nothing here executes automatically yet (Phase 6+).
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          {loading && <span className="font-label-numeric-sm text-label-numeric-sm text-outline">refreshing…</span>}
          <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
            Updated {new Date(data.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {error && (
        <div className="px-space-base py-space-xs bg-tertiary/10 text-tertiary font-body-sm text-body-sm">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left font-body-sm text-body-sm">
          <thead>
            <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
              <th className="py-2.5 px-space-sm font-semibold">#</th>
              <th className="py-2.5 px-space-sm font-semibold">Symbol</th>
              <th className="py-2.5 px-space-sm font-semibold">Action</th>
              <th className="py-2.5 px-space-sm font-semibold">Strategy</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">Confidence</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">Entry / SL / TP</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">R:R</th>
              <th className="py-2.5 px-space-sm font-semibold text-right">Score</th>
              <th className="py-2.5 px-space-sm font-semibold">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {data.opportunities.map((opp) => (
              <tr key={opp.symbol} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-outline">
                  {opp.rank}
                </td>
                <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">
                  <Link href={`/dashboard/scanner/${opp.symbol}`} className="hover:text-primary transition-colors">
                    {opp.symbol}
                  </Link>
                </td>
                <td className="py-space-sm px-space-sm">
                  <Badge tone={ACTION_TONE[opp.action]}>{opp.action}</Badge>
                </td>
                <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-on-surface-variant">
                  {opp.recommendedStrategy ?? "—"}
                </td>
                <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-on-surface">
                  {opp.confidence > 0 ? `${opp.confidence.toFixed(0)}%` : "—"}
                </td>
                <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-outline">
                  {opp.proposal
                    ? `${fmt(opp.proposal.entryPrice, 4)} / ${fmt(opp.proposal.stopLoss, 4)} / ${fmt(opp.proposal.takeProfit, 4)}`
                    : "—"}
                </td>
                <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-on-surface">
                  {opp.proposal ? `${opp.proposal.riskReward.toFixed(2)}:1` : "—"}
                </td>
                <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm text-on-surface font-semibold">
                  {opp.totalScore.toFixed(1)}
                </td>
                <td className="py-space-sm px-space-sm">
                  {opp.riskCheck ? (
                    <span title={opp.riskCheck.reasons.join(" | ")}>
                      <Badge tone={opp.riskCheck.decision === "APPROVED" ? "positive" : "negative"}>
                        {opp.riskCheck.decision}
                      </Badge>
                    </span>
                  ) : (
                    <span className="font-label-numeric-sm text-label-numeric-sm text-outline">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

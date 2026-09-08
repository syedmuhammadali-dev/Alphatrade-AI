import type { Metadata } from "next";
import { Card, Badge, StatTile } from "@alphatrade/ui";
import { mockPortfolio, mockPositions, mockRiskFactors } from "@/lib/mock-dashboard-data";

export const metadata: Metadata = { title: "Overview — AlphaTrade AI" };

export default function DashboardPage() {
  const p = mockPortfolio;

  return (
    <>
      {/* Status ticker */}
      <div className="w-full bg-surface-container-lowest px-space-base py-space-xs rounded flex flex-wrap items-center justify-between shadow-sm">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-tertiary" />
            <span className="font-label-caps text-label-caps uppercase text-tertiary tracking-widest font-semibold">
              DEMO TELEMETRY — NO LIVE FEED CONNECTED
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-base">
          <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
            Market data service ships in Phase 2
          </span>
        </div>
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-gutter-terminal">
        <StatTile
          label="Portfolio NAV"
          value={`$${p.nav.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          unit="USD"
          badge={<Badge tone="neutral">{p.navChangeLabel}</Badge>}
        />
        <StatTile
          label="24H P&L (Demo)"
          value={`+$${p.dailyPnl.toFixed(2)}`}
          unit="USD"
          valueClassName="text-secondary"
          badge={<span className="font-label-numeric-sm text-label-numeric-sm text-secondary font-medium">+{p.dailyPnlPct}%</span>}
          footer={
            <div className="space-y-1">
              <div className="flex items-center justify-between font-label-numeric-sm text-label-numeric-sm">
                <span className="text-outline font-label-caps text-label-caps uppercase">
                  DAILY QUOTA (${p.dailyQuotaTarget})
                </span>
                <span className="text-on-surface font-medium">{p.dailyQuotaPct}%</span>
              </div>
              <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden flex">
                <div className="bg-secondary h-full rounded-full" style={{ width: `${p.dailyQuotaPct}%` }} />
              </div>
            </div>
          }
        />
        <StatTile
          label="Unrealized Delta"
          value={`+$${p.unrealizedDelta.toFixed(2)}`}
          valueClassName="text-secondary"
          badge={
            <span className="font-label-numeric-sm text-label-numeric-sm text-primary font-medium">
              {p.openLongs}L / {p.openShorts}S
            </span>
          }
        />
        <StatTile
          label="VaR (24H, Demo)"
          value={`$${p.varUsd.toFixed(2)}`}
          unit={`${p.varPctOfNav}% NAV`}
          badge={<Badge tone="positive">STABLE</Badge>}
          footer={
            <div className="space-y-1">
              <div className="flex items-center justify-between font-label-numeric-sm text-label-numeric-sm">
                <span className="text-outline font-label-caps text-label-caps uppercase">
                  RISK CEILING &lt;{p.varCeilingPct}%
                </span>
                <span className="text-secondary font-medium">{p.varPctOfNav}%</span>
              </div>
              <div className="grid grid-cols-5 gap-1 h-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`rounded-sm ${i === 0 ? "bg-secondary" : "bg-surface-container"}`} />
                ))}
              </div>
            </div>
          }
        />
        <StatTile
          label="Autonomous Engine"
          value="IDLE"
          valueClassName="text-outline"
          unit="PHASE 8"
          footer={
            <div className="flex items-center justify-between pt-space-xs bg-surface-container-low px-space-sm py-1 rounded">
              <span className="font-label-caps text-label-caps text-outline uppercase">Orchestrator:</span>
              <span className="font-label-numeric-sm text-label-numeric-sm text-outline font-medium">
                Not deployed
              </span>
            </div>
          }
        />
      </section>

      {/* Core grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-terminal items-start">
        <div className="xl:col-span-8 flex flex-col gap-gutter-terminal">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-base">
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">
                    Portfolio Cumulative Performance
                  </span>
                  <Badge tone="info">DEMO CHART</Badge>
                </div>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  Equity curve will populate once paper trading (Phase 6) or live trading (Phase 9) is active.
                </p>
              </div>
            </div>
            <div className="w-full h-56 relative bg-surface-container-lowest/80 rounded overflow-hidden flex items-center justify-center border border-outline-variant/20">
              <span className="font-label-caps text-label-caps uppercase text-outline">
                No equity history yet
              </span>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-base">
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Fleet Allocation &amp; Exposure
                  </span>
                  <Badge tone="positive">{mockPositions.length} DEMO POSITIONS</Badge>
                </div>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  Illustrative rows only — the execution engine (Phase 9) is not wired up.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                    <th className="py-2.5 px-space-sm font-semibold">Asset / Strategy</th>
                    <th className="py-2.5 px-space-sm font-semibold">Side</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">Entry / Mark</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">Size</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">Unrealized P&amp;L</th>
                    <th className="py-2.5 px-space-sm font-semibold">Risk State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {mockPositions.map((pos) => (
                    <tr key={pos.symbol} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-space-sm px-space-sm">
                        <div className="flex items-center gap-space-xs">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs text-primary font-mono">
                            {pos.glyph}
                          </div>
                          <div>
                            <span className="font-label-numeric-md text-label-numeric-md font-semibold text-on-surface">
                              {pos.symbol}
                            </span>
                            <span className="block font-label-caps text-[9px] uppercase text-outline">
                              {pos.strategy}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-sm">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={pos.side === "LONG" ? "positive" : "negative"}>{pos.side}</Badge>
                          <span className="font-label-numeric-sm text-label-numeric-sm text-on-surface-variant font-mono">
                            {pos.leverage}
                          </span>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm">
                        <span className="text-outline">{pos.entry}</span>
                        <span className="block text-on-surface font-semibold">{pos.mark}</span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm">
                        <span className="text-on-surface font-medium">{pos.size}</span>
                        <span className="block text-outline">{pos.units}</span>
                      </td>
                      <td className="py-space-sm px-space-sm text-right font-label-numeric-sm text-label-numeric-sm">
                        <span className={`font-semibold ${pos.positive ? "text-secondary" : "text-error"}`}>
                          {pos.pnl}
                        </span>
                        <span className={`block text-[10px] ${pos.positive ? "text-secondary" : "text-error"}`}>
                          {pos.pnlPct}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-sm">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                          <span className="font-label-caps text-label-caps text-secondary font-medium">
                            {pos.riskState}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-gutter-terminal">
          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded bg-primary-container/20 border border-primary/40 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">deployed_code</span>
              </div>
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    AlphaTrade AI
                  </span>
                  <Badge tone="info">MVP v0.1</Badge>
                </div>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">Autonomous Capital Guard</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-space-base">
              <div>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Risk Configuration
                </span>
                <p className="font-body-sm text-body-sm text-outline mt-0.5">
                  Deterministic guardrails (Phase 5 will enforce these live)
                </p>
              </div>
              <span className="material-symbols-outlined text-outline text-lg">shield</span>
            </div>
            <div className="space-y-space-md">
              {mockRiskFactors.map((factor) => (
                <div key={factor.label}>
                  <div className="flex items-center justify-between font-label-numeric-sm text-label-numeric-sm mb-1">
                    <span className="font-label-caps text-label-caps uppercase text-outline">{factor.label}</span>
                    <span className="text-on-surface font-semibold font-mono">{factor.value}</span>
                  </div>
                  <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden flex">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${factor.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * Static placeholder data for the Phase 1 dashboard shell. No market-data,
 * analysis, or trading services exist yet (those land in Phases 2–9), so
 * every figure here is illustrative demo data only — never a real account
 * balance, P&L, or a claim of achievable returns.
 */
export const mockPortfolio = {
  nav: 24_850.0,
  navChangeLabel: "DEMO DATA",
  dailyPnl: 312.4,
  dailyPnlPct: 1.26,
  dailyQuotaTarget: 750,
  dailyQuotaPct: 41.6,
  unrealizedDelta: 96.2,
  openLongs: 2,
  openShorts: 0,
  varUsd: 210.0,
  varPctOfNav: 0.85,
  varCeilingPct: 2.5,
};

export const mockPositions: Array<{
  symbol: string;
  glyph: string;
  strategy: string;
  side: "LONG" | "SHORT";
  leverage: string;
  entry: string;
  mark: string;
  size: string;
  units: string;
  pnl: string;
  pnlPct: string;
  positive: boolean;
  riskState: string;
}> = [
  {
    symbol: "BTC/USDT",
    glyph: "₿",
    strategy: "TREND FOLLOWING (DEMO)",
    side: "LONG",
    leverage: "1.0x SPOT",
    entry: "$61,200.00",
    mark: "$62,180.50",
    size: "$1,200",
    units: "0.0195 BTC",
    pnl: "+$19.80",
    pnlPct: "+1.60%",
    positive: true,
    riskState: "WITHIN RISK BOUNDS",
  },
  {
    symbol: "ETH/USDT",
    glyph: "Ξ",
    strategy: "MOMENTUM (DEMO)",
    side: "LONG",
    leverage: "1.0x SPOT",
    entry: "$3,020.00",
    mark: "$2,995.10",
    size: "$800",
    units: "0.265 ETH",
    pnl: "-$6.60",
    pnlPct: "-0.82%",
    positive: false,
    riskState: "WITHIN RISK BOUNDS",
  },
];

export const mockRiskFactors = [
  { label: "Risk Per Trade", value: "0.4% / 1.0% cap", pct: 40 },
  { label: "Daily Loss Budget", value: "0.0% / 3.0% cap", pct: 0 },
  { label: "Open Positions", value: "2 / 3 max", pct: 66 },
];

import type { Metadata } from "next";
import Link from "next/link";
import type { SymbolAnalysisResponse } from "@alphatrade/shared-types";
import { Card, Badge } from "@alphatrade/ui";
import { serverApiFetch } from "@/lib/server-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return { title: `${symbol.toUpperCase()} Analysis — AlphaTrade AI` };
}

async function loadAnalysis(symbol: string): Promise<SymbolAnalysisResponse | null> {
  const res = await serverApiFetch(`/market/${encodeURIComponent(symbol)}/analysis`);
  if (!res.ok) return null;
  return res.json();
}

function fmt(value: number | null | undefined, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

const REGIME_TONE: Record<string, "positive" | "negative" | "info" | "warning" | "neutral"> = {
  TRENDING_BULLISH: "positive",
  TRENDING_BEARISH: "negative",
  HIGH_VOLATILITY: "warning",
  LOW_VOLATILITY: "info",
  RANGING: "neutral",
  UNCERTAIN: "neutral",
};

export default async function CoinAnalysisPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const data = await loadAnalysis(symbol);

  return (
    <div className="flex flex-col gap-gutter-terminal">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <Link
            href="/dashboard/scanner"
            className="font-label-caps text-label-caps uppercase text-outline hover:text-on-surface transition-colors"
          >
            ← Scanner
          </Link>
          <span className="font-headline-md text-headline-md font-semibold text-on-surface">
            {upperSymbol}
          </span>
          {data && <Badge tone={REGIME_TONE[data.regime] ?? "neutral"}>{data.regime.replace("_", " ")}</Badge>}
        </div>
      </div>

      {!data || !data.analysis ? (
        <Card>
          <p className="font-body-md text-body-md text-outline">
            Not enough candle history for {upperSymbol} yet — analysis is only available for symbols in the
            market-data watchlist (see <code>MARKET_DATA_WATCHLIST</code>), and needs at least 30 one-minute
            candles to compute reliably.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter-terminal items-start">
          <div className="xl:col-span-8 flex flex-col gap-gutter-terminal">
            <Card>
              <div className="flex items-center justify-between mb-space-base">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Technical Indicators
                </span>
                <span className="font-label-numeric-sm text-label-numeric-sm text-outline">
                  {data.analysis.timeframe} · {data.analysis.candleCount} candles
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-space-base font-label-numeric-md text-label-numeric-md">
                <IndicatorTile label="RSI (14)" value={fmt(data.analysis.rsi)} />
                <IndicatorTile label="ADX (14)" value={fmt(data.analysis.adx)} />
                <IndicatorTile label="ATR (14)" value={fmt(data.analysis.atr, 4)} />
                <IndicatorTile label="VWAP" value={fmt(data.analysis.vwap, 4)} />
                <IndicatorTile label="EMA 20" value={fmt(data.analysis.ema20, 4)} />
                <IndicatorTile label="EMA 50" value={fmt(data.analysis.ema50, 4)} />
                <IndicatorTile label="EMA 200" value={fmt(data.analysis.ema200, 4)} />
                <IndicatorTile label="Volume Ratio" value={fmt(data.analysis.volumeRatio)} />
              </div>
              <div className="mt-space-base pt-space-base border-t border-outline-variant/20 grid grid-cols-3 gap-space-base">
                <IndicatorTile label="MACD" value={fmt(data.analysis.macd.value, 4)} />
                <IndicatorTile label="MACD Signal" value={fmt(data.analysis.macd.signal, 4)} />
                <IndicatorTile label="MACD Histogram" value={fmt(data.analysis.macd.histogram, 4)} />
              </div>
            </Card>
          </div>

          <div className="xl:col-span-4 flex flex-col gap-gutter-terminal">
            <Card>
              <div className="flex items-center justify-between mb-space-base">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Market Structure
                </span>
                {data.structure && (
                  <Badge tone={data.structure.bias === "BULLISH_STRUCTURE" ? "positive" : data.structure.bias === "BEARISH_STRUCTURE" ? "negative" : "neutral"}>
                    {data.structure.pattern.replace("_", "/")}
                  </Badge>
                )}
              </div>
              {data.structure ? (
                <div className="space-y-space-sm font-label-numeric-sm text-label-numeric-sm">
                  <Row label="Bias" value={data.structure.bias.replace("_", " ")} />
                  <Row label="Support" value={fmt(data.structure.support, 4)} />
                  <Row label="Resistance" value={fmt(data.structure.resistance, 4)} />
                  <Row
                    label="Breakout"
                    value={data.structure.breakout ? "YES" : "No"}
                    tone={data.structure.breakout ? "text-secondary" : undefined}
                  />
                  <Row
                    label="Breakdown"
                    value={data.structure.breakdown ? "YES" : "No"}
                    tone={data.structure.breakdown ? "text-error" : undefined}
                  />
                </div>
              ) : (
                <p className="font-body-sm text-body-sm text-outline">Insufficient data for structure detection.</p>
              )}
            </Card>

            <Card>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Trend Label</span>
              <p className="mt-space-sm font-label-numeric-lg text-label-numeric-lg uppercase text-on-surface">
                {data.analysis.trend}
              </p>
              <p className="mt-space-xs font-body-sm text-body-sm text-outline">
                Simple price-vs-EMA directional label — distinct from the fuller market regime classification above.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function IndicatorTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-low rounded p-space-sm">
      <div className="font-label-caps text-label-caps uppercase text-outline">{label}</div>
      <div className="mt-space-2xs text-on-surface">{value}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-label-caps text-label-caps uppercase text-outline">{label}</span>
      <span className={tone ?? "text-on-surface"}>{value}</span>
    </div>
  );
}

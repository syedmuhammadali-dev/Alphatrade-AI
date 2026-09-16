import type { Metadata } from "next";
import type { RiskConfig } from "@alphatrade/shared-types";
import { RiskConfigForm } from "@/components/RiskConfigForm";
import { serverApiFetch } from "@/lib/server-api";

export const metadata: Metadata = { title: "Risk & Security — AlphaTrade AI" };

const FALLBACK_CONFIG: RiskConfig = {
  riskPerTradePercent: 1,
  maxDailyLossPercent: 3,
  maxOpenPositions: 3,
  maxLosingStreak: 5,
  maxPortfolioExposurePercent: 50,
  minimumRiskReward: 2,
  minimumConfidence: 75,
  maxPositionSizePercent: 20,
  accountBalanceUsd: 10_000,
};

async function loadRiskConfig(): Promise<RiskConfig> {
  const res = await serverApiFetch("/risk/config");
  if (!res.ok) return FALLBACK_CONFIG;
  const body = await res.json();
  return body.config;
}

export default async function RiskPage() {
  const config = await loadRiskConfig();
  return <RiskConfigForm initial={config} />;
}

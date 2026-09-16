import type { Metadata } from "next";
import type { StrategyInfo } from "@alphatrade/shared-types";
import { StrategyList } from "@/components/StrategyList";
import { serverApiFetch } from "@/lib/server-api";

export const metadata: Metadata = { title: "Strategy Engine — AlphaTrade AI" };

async function loadStrategies(): Promise<StrategyInfo[]> {
  const res = await serverApiFetch("/strategies");
  if (!res.ok) return [];
  const body = await res.json();
  return body.strategies;
}

export default async function StrategiesPage() {
  const strategies = await loadStrategies();
  return <StrategyList strategies={strategies} />;
}

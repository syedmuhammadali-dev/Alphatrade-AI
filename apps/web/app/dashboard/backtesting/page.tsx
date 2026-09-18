import type { Metadata } from "next";
import { BacktestingDashboard } from "@/components/BacktestingDashboard";

export const metadata: Metadata = { title: "Backtesting — AlphaTrade AI" };

export default function BacktestingPage() {
  return <BacktestingDashboard />;
}

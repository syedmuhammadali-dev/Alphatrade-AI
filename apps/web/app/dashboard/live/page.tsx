import type { Metadata } from "next";
import { LiveTradingDashboard } from "@/components/LiveTradingDashboard";

export const metadata: Metadata = { title: "Live Trading — AlphaTrade AI" };

export default function LivePage() {
  return <LiveTradingDashboard />;
}

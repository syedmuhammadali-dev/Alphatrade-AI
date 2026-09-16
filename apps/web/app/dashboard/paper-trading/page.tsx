import type { Metadata } from "next";
import { PaperTradingDashboard } from "@/components/PaperTradingDashboard";

export const metadata: Metadata = { title: "Paper Trading — AlphaTrade AI" };

export default function PaperTradingPage() {
  return <PaperTradingDashboard />;
}

import type { Metadata } from "next";
import { BotControlPanel } from "@/components/BotControlPanel";

export const metadata: Metadata = { title: "Autonomous Bot — AlphaTrade AI" };

export default function BotPage() {
  return <BotControlPanel />;
}

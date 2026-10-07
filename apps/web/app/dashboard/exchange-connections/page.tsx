import type { Metadata } from "next";
import { ExchangeConnectionsPanel } from "@/components/ExchangeConnectionsPanel";

export const metadata: Metadata = { title: "Exchange Connections — AlphaTrade AI" };

export default function ExchangeConnectionsPage() {
  return <ExchangeConnectionsPanel />;
}

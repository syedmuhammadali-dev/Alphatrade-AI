import type { Metadata } from "next";
import type { ScannerResponse } from "@alphatrade/shared-types";
import { ScannerTable } from "@/components/ScannerTable";
import { serverApiFetch } from "@/lib/server-api";

export const metadata: Metadata = { title: "Market Scanner — AlphaTrade AI" };

async function loadInitialScanner(): Promise<ScannerResponse> {
  const res = await serverApiFetch("/market/scanner?limit=50");
  if (!res.ok) {
    return { updatedAt: new Date().toISOString(), count: 0, entries: [] };
  }
  return res.json();
}

export default async function ScannerPage() {
  const initial = await loadInitialScanner();

  return <ScannerTable initial={initial} />;
}

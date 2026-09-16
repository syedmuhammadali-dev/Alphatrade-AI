import type { Metadata } from "next";
import type { OpportunitiesResponse } from "@alphatrade/shared-types";
import { DecisionsTable } from "@/components/DecisionsTable";
import { serverApiFetch } from "@/lib/server-api";

export const metadata: Metadata = { title: "AI Decisions — AlphaTrade AI" };

async function loadInitial(): Promise<OpportunitiesResponse> {
  const res = await serverApiFetch("/decisions");
  if (!res.ok) {
    return { updatedAt: new Date().toISOString(), opportunities: [] };
  }
  return res.json();
}

export default async function DecisionsPage() {
  const initial = await loadInitial();
  return <DecisionsTable initial={initial} />;
}

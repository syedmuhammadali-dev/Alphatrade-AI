import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToApi(request, `/backtests/${encodeURIComponent(id)}`, { method: "GET" });
}

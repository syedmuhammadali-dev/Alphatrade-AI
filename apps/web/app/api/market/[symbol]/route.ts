import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return proxyToApi(request, `/market/${encodeURIComponent(symbol)}`, { method: "GET" });
}

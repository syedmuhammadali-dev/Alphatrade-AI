import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToApi(request, `/paper/positions/${encodeURIComponent(id)}/close`, { method: "POST" });
}

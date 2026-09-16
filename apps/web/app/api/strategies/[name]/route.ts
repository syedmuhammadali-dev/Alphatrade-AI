import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return proxyToApi(request, `/strategies/${encodeURIComponent(name)}`, { method: "PATCH" });
}

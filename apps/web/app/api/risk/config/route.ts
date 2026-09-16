import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET(request: NextRequest) {
  return proxyToApi(request, "/risk/config", { method: "GET" });
}

export async function PATCH(request: NextRequest) {
  return proxyToApi(request, "/risk/config", { method: "PATCH" });
}

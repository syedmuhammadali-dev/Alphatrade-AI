import type { NextRequest } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

const ALLOWED_ACTIONS = new Set(["start", "pause", "resume", "stop", "emergency-stop", "reset"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!ALLOWED_ACTIONS.has(action)) {
    return new Response(JSON.stringify({ error: "Unknown bot action." }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  return proxyToApi(request, `/bot/${action}`, { method: "POST" });
}

import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "./api-config";

/**
 * Forwards a request from a Next.js route handler to the Fastify API,
 * passing through the incoming cookies and relaying any Set-Cookie headers
 * from the API response back to the browser on the web app's own origin.
 */
export async function proxyToApi(
  request: NextRequest,
  path: string,
  init: { method: string },
): Promise<NextResponse> {
  const cookie = request.headers.get("cookie") ?? "";
  const rawBody = init.method === "GET" || init.method === "HEAD" ? "" : await request.text();
  // Passing even an empty string as fetch's `body` makes it auto-set
  // Content-Type: text/plain (per the fetch spec, for any string body) —
  // Fastify then parses the request as text/plain instead of JSON, handing
  // route handlers a raw string instead of undefined/an object. `undefined`
  // is the only value that actually omits the body (and the header).
  const body = rawBody ? rawBody : undefined;

  const headers: Record<string, string> = { cookie };
  if (body) {
    // Only send content-type when there's an actual body — Fastify's JSON
    // parser 400s on an empty body declared as application/json, which for
    // body-less POSTs (e.g. /auth/logout) would fail before our route
    // handler ever runs, leaving auth cookies uncleared.
    headers["content-type"] = "application/json";
  }

  const search = request.nextUrl.search;
  const apiResponse = await fetch(`${getApiBaseUrl()}${path}${search}`, {
    method: init.method,
    headers,
    body,
  });

  const responseBody = await apiResponse.text();
  const response = new NextResponse(responseBody, {
    status: apiResponse.status,
    headers: { "content-type": "application/json" },
  });

  for (const setCookie of apiResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", setCookie);
  }

  return response;
}

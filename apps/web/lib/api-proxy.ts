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
  const body = init.method === "GET" || init.method === "HEAD" ? undefined : await request.text();

  const apiResponse = await fetch(`${getApiBaseUrl()}${path}`, {
    method: init.method,
    headers: {
      "content-type": "application/json",
      cookie,
    },
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

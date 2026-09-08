/**
 * Server-only base URL for the Fastify API. Next.js route handlers proxy to
 * this and relay Set-Cookie headers, so cookies end up scoped to the web
 * app's own origin (works even when web/api live on different domains in
 * production, unlike calling the API directly from the browser).
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL (or API_URL) must be set for the web app to reach the API.");
  }
  return url;
}

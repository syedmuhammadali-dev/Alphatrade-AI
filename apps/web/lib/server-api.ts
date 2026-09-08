import { cookies } from "next/headers";
import { getApiBaseUrl } from "./api-config";

/** Server Component helper: calls the Fastify API directly, forwarding the incoming request's cookies. */
export async function serverApiFetch(path: string): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(`${getApiBaseUrl()}${path}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
}

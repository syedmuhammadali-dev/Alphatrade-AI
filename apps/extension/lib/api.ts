import { getSession, setSession, clearSession, type Session } from "./storage";

/** Points at apps/api directly — change for a non-local deployment. */
export const API_BASE_URL = "http://localhost:4000";

export class AuthRequiredError extends Error {}
export class ApiError extends Error {}

export interface BotStatusResponse {
  status: "stopped" | "running" | "paused" | "emergency_stopped";
  name: string;
  updatedAt: string;
}

export interface PaperAccount {
  balanceUsd: number;
  startingBalanceUsd: number;
  equityUsd: number;
  openPositionsCount: number;
}

export interface PaperPosition {
  id: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number | null;
  unrealizedPnlUsd: number | null;
  strategy: string;
}

export interface RankedOpportunity {
  symbol: string;
  rank: number;
  confidence: number;
  action: "LONG" | "SHORT" | "NO_TRADE";
  recommendedStrategy: string | null;
  proposal: { regime: string; riskReward: number } | null;
}

async function rawFetch(path: string, init: RequestInit, accessToken?: string): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

/** Attaches the stored access token, and transparently refreshes it once on a 401 before giving up. */
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await getSession();
  if (!session) throw new AuthRequiredError("Not logged in.");

  let res = await rawFetch(path, init, session.accessToken);
  if (res.status === 401) {
    const refreshed = await tryRefresh(session);
    if (!refreshed) {
      await clearSession();
      throw new AuthRequiredError("Session expired. Please log in again.");
    }
    res = await rawFetch(path, init, refreshed.accessToken);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status}).`);
  return body as T;
}

async function tryRefresh(session: Session): Promise<Session | null> {
  const res = await rawFetch("/auth/extension-refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  const next: Session = {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    email: session.email,
  };
  await setSession(next);
  return next;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await rawFetch("/auth/extension-login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? "Login failed.");
  await setSession({ accessToken: body.accessToken, refreshToken: body.refreshToken, email });
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) {
    await rawFetch("/auth/extension-logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => undefined);
  }
  await clearSession();
}

export const getBotStatus = () => apiFetch<BotStatusResponse>("/bot/status");
export const runBotAction = (
  action: "start" | "pause" | "resume" | "stop" | "emergency-stop" | "reset",
) => apiFetch<BotStatusResponse>(`/bot/${action}`, { method: "POST" });

export const getPaperAccount = () => apiFetch<PaperAccount>("/paper/account");
export const getPaperPositions = () => apiFetch<{ positions: PaperPosition[] }>("/paper/positions");
export const getOpportunities = () =>
  apiFetch<{ opportunities: RankedOpportunity[] }>("/decisions");

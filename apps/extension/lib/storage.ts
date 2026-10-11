export interface Session {
  accessToken: string;
  refreshToken: string;
  email: string;
}

const KEY = "alphatrade_session";

export async function getSession(): Promise<Session | null> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as Session | undefined) ?? null;
}

export async function setSession(session: Session): Promise<void> {
  await chrome.storage.local.set({ [KEY]: session });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}

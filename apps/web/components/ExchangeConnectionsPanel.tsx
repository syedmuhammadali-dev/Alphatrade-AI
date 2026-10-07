"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExchangeConnectionSummary } from "@alphatrade/shared-types";
import { Card, Badge, Button } from "@alphatrade/ui";

export function ExchangeConnectionsPanel() {
  const [connections, setConnections] = useState<ExchangeConnectionSummary[]>([]);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [testnet, setTestnet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/exchange-connections");
    if (res.ok) setConnections((await res.json()).connections);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleConnect(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exchange-connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label, apiKey, apiSecret, testnet }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed to connect.");
        return;
      }
      setLabel("");
      setApiKey("");
      setApiSecret("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleTest(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/exchange-connections/${id}/test`, { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/exchange-connections/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-gutter-terminal">
      <Card className="border border-tertiary/30">
        <div className="flex items-center gap-space-xs mb-space-xs">
          <span className="material-symbols-outlined text-tertiary text-lg">warning</span>
          <span className="font-label-caps text-label-caps uppercase text-tertiary tracking-wider">Real money risk</span>
        </div>
        <p className="font-body-sm text-body-sm text-outline">
          A connection you add here can place real orders on your exchange account once used from the Live Trading
          page — read + trade permissions only, never withdrawal. New connections default to Binance&rsquo;s
          <strong className="text-on-surface"> testnet</strong> (no real funds). Only uncheck testnet if you
          understand you are trading with real money. Keys are encrypted at rest (AES-256-GCM) and never shown
          again after you add them.
        </p>
      </Card>

      <Card>
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Connect an Exchange</span>
        <form onSubmit={handleConnect} className="grid grid-cols-1 md:grid-cols-2 gap-space-base mt-space-base">
          <div className="flex flex-col gap-space-2xs">
            <label htmlFor="ec-label" className="font-label-caps text-label-caps uppercase text-outline tracking-wider">Label</label>
            <input
              id="ec-label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Binance Testnet"
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex items-end gap-space-sm">
            <label className="flex items-center gap-space-xs font-label-caps text-label-caps uppercase text-outline tracking-wider">
              <input type="checkbox" checked={testnet} onChange={(e) => setTestnet(e.target.checked)} />
              Testnet (recommended)
            </label>
          </div>
          <div className="flex flex-col gap-space-2xs">
            <label htmlFor="ec-key" className="font-label-caps text-label-caps uppercase text-outline tracking-wider">API Key</label>
            <input
              id="ec-key"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-space-2xs">
            <label htmlFor="ec-secret" className="font-label-caps text-label-caps uppercase text-outline tracking-wider">API Secret</label>
            <input
              id="ec-secret"
              required
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="h-8 bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-space-sm pt-space-sm">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Connecting…" : "Connect"}
            </Button>
            {error && <span className="font-label-caps text-label-caps text-error">{error}</span>}
          </div>
        </form>
      </Card>

      <Card>
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Your Connections</span>
        {connections.length === 0 ? (
          <p className="font-body-sm text-body-sm text-outline mt-space-sm">No exchange connections yet.</p>
        ) : (
          <div className="overflow-x-auto mt-space-base">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead>
                <tr className="text-outline font-label-caps text-label-caps uppercase bg-surface-container-low/70">
                  <th className="py-2 px-space-sm font-semibold">Label</th>
                  <th className="py-2 px-space-sm font-semibold">Exchange</th>
                  <th className="py-2 px-space-sm font-semibold">Key</th>
                  <th className="py-2 px-space-sm font-semibold">Network</th>
                  <th className="py-2 px-space-sm font-semibold">Status</th>
                  <th className="py-2 px-space-sm font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {connections.map((c) => (
                  <tr key={c.id}>
                    <td className="py-space-sm px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface">{c.label}</td>
                    <td className="py-space-sm px-space-sm text-outline">{c.exchange}</td>
                    <td className="py-space-sm px-space-sm font-label-numeric-sm text-label-numeric-sm text-outline">{c.apiKeyLast4}</td>
                    <td className="py-space-sm px-space-sm">
                      <Badge tone={c.testnet ? "neutral" : "warning"}>{c.testnet ? "Testnet" : "Mainnet"}</Badge>
                    </td>
                    <td className="py-space-sm px-space-sm">
                      <Badge tone={c.canTrade ? "positive" : c.canTrade === false ? "negative" : "neutral"}>
                        {c.canTrade === null ? "Unverified" : c.canTrade ? "Can Trade" : "Failed"}
                      </Badge>
                    </td>
                    <td className="py-space-sm px-space-sm text-center space-x-space-xs">
                      <button
                        onClick={() => handleTest(c.id)}
                        disabled={busy}
                        className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded font-label-caps text-label-caps uppercase transition-colors disabled:opacity-50"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={busy}
                        className="px-2 py-1 bg-error/10 hover:bg-error/20 text-error rounded font-label-caps text-label-caps uppercase transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

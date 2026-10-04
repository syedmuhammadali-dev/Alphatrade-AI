"use client";

import { useCallback, useEffect, useState } from "react";
import type { BotStatusResponse, BotStatus } from "@alphatrade/shared-types";
import { Card, Badge, Button } from "@alphatrade/ui";

const POLL_INTERVAL_MS = 10_000;

const STATUS_TONE: Record<BotStatus, "neutral" | "positive" | "warning" | "negative"> = {
  stopped: "neutral",
  running: "positive",
  paused: "warning",
  emergency_stopped: "negative",
};

const STATUS_COPY: Record<BotStatus, string> = {
  stopped: "Not scanning or entering trades. Open paper positions are still protected by their stop-loss/take-profit.",
  running: "Scanning the watchlist and entering paper trades that pass the AI, Risk Engine, and paper-account checks.",
  paused: "No new entries. Open paper positions are still protected by their stop-loss/take-profit.",
  emergency_stopped: "Halted. No new entries, and no automatic action beyond protective stop-loss/take-profit exits. Reset to stopped to continue.",
};

/** Which controls are valid from each state — mirrors the API's state machine so the UI never offers an action the API would reject. */
const ACTIONS_BY_STATUS: Record<BotStatus, Array<{ action: string; label: string; variant: "primary" | "ghost" | "danger" }>> = {
  stopped: [
    { action: "start", label: "Start Bot", variant: "primary" },
    { action: "emergency-stop", label: "Emergency Stop", variant: "danger" },
  ],
  running: [
    { action: "pause", label: "Pause", variant: "ghost" },
    { action: "stop", label: "Stop", variant: "ghost" },
    { action: "emergency-stop", label: "Emergency Stop", variant: "danger" },
  ],
  paused: [
    { action: "resume", label: "Resume", variant: "primary" },
    { action: "stop", label: "Stop", variant: "ghost" },
    { action: "emergency-stop", label: "Emergency Stop", variant: "danger" },
  ],
  emergency_stopped: [{ action: "reset", label: "Reset to Stopped", variant: "ghost" }],
};

export function BotControlPanel() {
  const [bot, setBot] = useState<BotStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/bot/status");
    if (res.ok) setBot(await res.json());
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function handleAction(action: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bot/${action}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Action failed.");
        return;
      }
      setBot(body);
    } finally {
      setBusy(false);
    }
  }

  if (!bot) {
    return <Card><p className="font-body-sm text-body-sm text-outline">Loading bot status…</p></Card>;
  }

  return (
    <div className="flex flex-col gap-gutter-terminal">
      <Card>
        <div className="flex items-center justify-between mb-space-base">
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">{bot.name}</span>
          <Badge tone={STATUS_TONE[bot.status]}>{bot.status.replace("_", " ")}</Badge>
        </div>
        <p className="font-body-sm text-body-sm text-outline">{STATUS_COPY[bot.status]}</p>

        <div className="flex flex-wrap items-center gap-space-sm mt-space-base">
          {ACTIONS_BY_STATUS[bot.status].map((a) => (
            <Button
              key={a.action}
              variant={a.variant}
              disabled={busy}
              onClick={() => handleAction(a.action)}
            >
              {a.label}
            </Button>
          ))}
          {error && <span className="font-label-caps text-label-caps text-error">{error}</span>}
        </div>
      </Card>

      <Card>
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">About the autonomous bot</span>
        <p className="font-body-sm text-body-sm text-outline mt-space-xs">
          The bot is a paper-trading bot for now: it only ever places simulated trades against your virtual account
          at live market prices. Live exchange execution is Phase 9 and is not connected. Every entry still passes
          the independent Risk Engine, and the bot never bypasses the risk configuration on the Risk &amp; Security page.
        </p>
      </Card>
    </div>
  );
}

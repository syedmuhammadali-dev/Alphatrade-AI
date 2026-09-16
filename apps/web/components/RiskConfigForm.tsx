"use client";

import { useState } from "react";
import type { RiskConfig } from "@alphatrade/shared-types";
import { Card, Button } from "@alphatrade/ui";

const FIELDS: Array<{ key: keyof RiskConfig; label: string; suffix: string; step?: string }> = [
  { key: "minimumConfidence", label: "Minimum Confidence", suffix: "%" },
  { key: "minimumRiskReward", label: "Minimum Risk:Reward", suffix: ":1", step: "0.1" },
  { key: "riskPerTradePercent", label: "Risk Per Trade", suffix: "% of balance", step: "0.1" },
  { key: "maxDailyLossPercent", label: "Max Daily Loss", suffix: "% of balance", step: "0.1" },
  { key: "maxOpenPositions", label: "Max Concurrent Positions", suffix: "positions" },
  { key: "maxLosingStreak", label: "Max Losing Streak", suffix: "trades" },
  { key: "maxPortfolioExposurePercent", label: "Max Portfolio Exposure", suffix: "% of balance" },
  { key: "maxPositionSizePercent", label: "Max Position Size", suffix: "% of balance" },
  { key: "accountBalanceUsd", label: "Reference Account Balance", suffix: "USD" },
];

export function RiskConfigForm({ initial }: { initial: RiskConfig }) {
  const [config, setConfig] = useState<RiskConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/risk/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const body = await res.json();
        setConfig(body.config);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="mb-space-base">
        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
          Risk Configuration
        </span>
        <p className="font-body-sm text-body-sm text-outline mt-space-xs">
          Deterministic, configurable rules the Independent Risk Engine applies to every trade proposal before it
          could ever reach execution. This engine is isolated from the AI/strategy layer — it only ever sees a
          plain proposal, never strategy internals or exchange credentials. No paper or live trading exists yet
          (Phases 6/9), so open-position/P&amp;L state is assumed empty for now.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-space-base">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-space-2xs">
            <label
              htmlFor={field.key}
              className="font-label-caps text-label-caps uppercase text-outline tracking-wider"
            >
              {field.label}
            </label>
            <div className="flex items-center gap-space-xs">
              <input
                id={field.key}
                type="number"
                step={field.step ?? "1"}
                value={config[field.key]}
                onChange={(e) => setConfig((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                className="h-8 w-full bg-surface-container-lowest border border-white/10 rounded px-space-sm font-label-numeric-md text-label-numeric-md text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
              <span className="font-label-caps text-label-caps text-outline whitespace-nowrap">{field.suffix}</span>
            </div>
          </div>
        ))}

        <div className="md:col-span-2 flex items-center gap-space-sm pt-space-sm">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save Risk Config"}
          </Button>
          {saved && <span className="font-label-caps text-label-caps text-secondary uppercase">Saved</span>}
        </div>
      </form>
    </Card>
  );
}

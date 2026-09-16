"use client";

import { useState } from "react";
import type { StrategyInfo } from "@alphatrade/shared-types";
import { Card, Badge } from "@alphatrade/ui";

export function StrategyList({ strategies }: { strategies: StrategyInfo[] }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(strategies.map((s) => [s.name, true])),
  );
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(name: string) {
    const next = !enabled[name];
    setPending(name);
    try {
      const res = await fetch(`/api/strategies/${encodeURIComponent(name)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (res.ok) {
        setEnabled((prev) => ({ ...prev, [name]: next }));
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-gutter-terminal">
      {strategies.map((strategy) => (
        <div key={strategy.name} data-testid={`strategy-card-${strategy.name}`}>
        <Card className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {strategy.name}
              </span>
              <Badge tone={enabled[strategy.name] ? "positive" : "neutral"}>
                {enabled[strategy.name] ? "ENABLED" : "DISABLED"}
              </Badge>
            </div>
            <p className="font-body-sm text-body-sm text-outline mt-space-xs">{strategy.description}</p>
            <p className="font-label-caps text-label-caps uppercase text-outline mt-space-xs">
              Runs in: {strategy.requiredConditions.join(", ")}
            </p>
          </div>
          <button
            onClick={() => toggle(strategy.name)}
            disabled={pending === strategy.name}
            className={`px-space-sm py-1.5 rounded font-label-caps text-label-caps uppercase font-bold tracking-wider transition-colors disabled:opacity-50 ${
              enabled[strategy.name]
                ? "bg-error-container/20 border border-error/50 text-error hover:bg-error-container/40"
                : "bg-secondary/15 border border-secondary/40 text-secondary hover:bg-secondary/25"
            }`}
          >
            {enabled[strategy.name] ? "Disable" : "Enable"}
          </button>
        </Card>
        </div>
      ))}
    </div>
  );
}

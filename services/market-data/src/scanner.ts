import type { ScannerEntry } from "@alphatrade/shared-types";
import type { MarketDataStore } from "./store";

export interface ScannerOptions {
  quoteFilter?: string;
  limit?: number;
}

/**
 * Ranks symbols by 24hr quote volume (liquidity) — a straightforward market
 * scan, not the strategy-aware Opportunity Ranker (that's Phase 4, and
 * factors in trend/structure/risk-reward on top of raw volume).
 */
export function buildScanner(store: MarketDataStore, options: ScannerOptions = {}): ScannerEntry[] {
  const quoteFilter = options.quoteFilter?.toUpperCase();
  const limit = options.limit ?? 100;

  const filtered = store
    .listTickers()
    .filter((t) => !quoteFilter || t.symbol.endsWith(quoteFilter))
    .sort((a, b) => b.quoteVolume - a.quoteVolume)
    .slice(0, limit);

  return filtered.map((ticker, index) => ({ ...ticker, rank: index + 1 }));
}

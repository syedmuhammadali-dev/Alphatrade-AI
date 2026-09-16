import type { OpportunitiesResponse } from "@alphatrade/shared-types";
import { STRATEGIES, runAllStrategies, selectBestSignal, rankOpportunities, type RankerInput } from "@alphatrade/strategy-engine";
import { fetchAnalysis, fetchScanner } from "./upstream-clients";
import { applyThresholds, DEFAULT_THRESHOLDS, type Thresholds } from "./thresholds";

export interface OpportunitiesOptions extends Thresholds {
  enabledStrategies?: string[];
}

/** Scans multiple symbols and ranks them — the Opportunity Ranker stage. NO_TRADE is a valid, included outcome. */
export async function computeOpportunities(
  analysisEngineUrl: string,
  marketDataUrl: string,
  symbols: string[],
  options: OpportunitiesOptions = DEFAULT_THRESHOLDS,
): Promise<OpportunitiesResponse> {
  const scanner = await fetchScanner(marketDataUrl);
  const quoteVolumeBySymbol = new Map(scanner.entries.map((e) => [e.symbol, e.quoteVolume]));

  const strategies = options.enabledStrategies
    ? STRATEGIES.filter((s) => options.enabledStrategies!.includes(s.name))
    : STRATEGIES;

  const inputs: RankerInput[] = await Promise.all(
    symbols.map(async (symbol): Promise<RankerInput> => {
      const { analysis, structure, regime } = await fetchAnalysis(analysisEngineUrl, symbol);

      if (analysis === null || structure === null) {
        return {
          symbol,
          analysis: null,
          structure: null,
          regime,
          quoteVolume: quoteVolumeBySymbol.get(symbol) ?? null,
          bestSignal: { strategyName: "none", action: "NO_TRADE", confidence: 0, entryZone: null, stopLoss: null, takeProfit: null, riskReward: null, reasoning: "Not enough candle history yet." },
        };
      }

      const context = { symbol, analysis, structure, regime };
      const signals = runAllStrategies(context, strategies);
      const bestSignal = applyThresholds(selectBestSignal(signals), options);

      return {
        symbol,
        analysis,
        structure,
        regime,
        quoteVolume: quoteVolumeBySymbol.get(symbol) ?? null,
        bestSignal,
      };
    }),
  );

  return {
    updatedAt: new Date().toISOString(),
    opportunities: rankOpportunities(inputs),
  };
}

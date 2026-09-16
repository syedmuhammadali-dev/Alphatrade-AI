import type { TradingStrategy } from "../types";
import { TrendFollowingStrategy } from "./trend-following";
import { BreakoutStrategy } from "./breakout";
import { MomentumStrategy } from "./momentum";
import { MeanReversionStrategy } from "./mean-reversion";

export { TrendFollowingStrategy, BreakoutStrategy, MomentumStrategy, MeanReversionStrategy };

export const STRATEGIES: TradingStrategy[] = [
  new TrendFollowingStrategy(),
  new BreakoutStrategy(),
  new MomentumStrategy(),
  new MeanReversionStrategy(),
];

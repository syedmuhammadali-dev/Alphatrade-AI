/** A representative spot taker fee (Binance's standard spot taker rate is 0.1%). */
export const TAKER_FEE_RATE = 0.001;

export function computeFee(notionalValueUsd: number, feeRate: number = TAKER_FEE_RATE): number {
  return notionalValueUsd * feeRate;
}

const SYMBOL_PATTERN = /\/trade\/([A-Za-z0-9]+)_([A-Za-z0-9]+)/;

/** Pulls a trading symbol (e.g. "BTCUSDT") out of a Binance trade-page URL, or null if it doesn't match. */
export function extractSymbol(href: string): string | null {
  const match = href.match(SYMBOL_PATTERN);
  if (!match) return null;
  return `${match[1]}${match[2]}`.toUpperCase();
}

/**
 * Optional content script (Phase 10): detects the symbol a user is looking
 * at on Binance's trade pages and surfaces it in the popup. Reads only the
 * current tab's URL — never page content, account data, or anything else on
 * the page.
 */
import { extractSymbol } from "../lib/symbol";

function reportCurrentSymbol() {
  const symbol = extractSymbol(location.href);
  chrome.storage.local.set({ alphatrade_viewed_symbol: symbol });
}

export default defineContentScript({
  matches: ["https://*.binance.com/*"],
  main() {
    reportCurrentSymbol();
    // Binance is a single-page app — the URL changes without a full
    // navigation, so there's no event to hook; a short poll is the simplest
    // reliable way to notice it.
    setInterval(reportCurrentSymbol, 2000);
  },
});

import { defineConfig } from "wxt";

/**
 * AlphaTrade AI's Chrome extension (Phase 10). Manifest V3, talks only to
 * apps/api — the same authenticated REST API the web app uses — never to
 * Postgres or an exchange directly. host_permissions covers both local dev
 * and the handful of exchange pages the optional content script reads a
 * viewed symbol from; it never reads page content beyond that.
 */
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "AlphaTrade AI",
    description: "Portfolio, bot controls, and AI decisions for AlphaTrade AI, without leaving the page you're on.",
    permissions: ["storage"],
    host_permissions: ["http://localhost:4000/*", "https://*.binance.com/*"],
  },
});

import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("coin analysis (real Binance data via analysis-engine)", () => {
  test("shows real technical analysis for a watchlist symbol after clicking through from the scanner", async ({
    page,
    request,
  }) => {
    const email = `e2e-analysis-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";

    const registerRes = await request.post("/api/auth/register", { data: { email, password } });
    expect(registerRes.ok()).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Market Scanner" }).click();
    await expect(page).toHaveURL(/\/dashboard\/scanner$/);

    // BTCUSDT is in the default watchlist, so it should have candle history
    // and real analysis — navigate directly rather than depending on
    // scanner row ordering (rank can shift with live data).
    await page.goto("/dashboard/scanner/BTCUSDT");
    await expect(page).toHaveURL(/\/dashboard\/scanner\/BTCUSDT$/);

    await expect(page.getByText("BTCUSDT", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Technical Indicators")).toBeVisible();
    await expect(page.getByText("RSI (14)")).toBeVisible();
    await expect(page.getByText("Market Structure")).toBeVisible();

    // Real regime badge should be one of the deterministic classifier's outputs.
    const regimeBadge = page.locator("text=/TRENDING|RANGING|VOLATILITY|UNCERTAIN/").first();
    await expect(regimeBadge).toBeVisible();
  });

  test("clicking a scanner row navigates to that symbol's analysis page", async ({ page, request }) => {
    const email = `e2e-analysis-click-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/dashboard/scanner");

    const firstSymbolLink = page.locator("tbody tr").first().locator("a");
    await expect(firstSymbolLink).toBeVisible({ timeout: 15_000 });
    await firstSymbolLink.click();

    await expect(page).toHaveURL(/\/dashboard\/scanner\/[A-Z0-9]+$/);
  });
});

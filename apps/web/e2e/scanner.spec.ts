import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("market scanner (real Binance data via market-data service)", () => {
  test("shows live-ranked USDT pairs after logging in", async ({ page, request }) => {
    const email = `e2e-scanner-${randomUUID()}@example.com`;
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

    await expect(page.getByRole("main").getByText("Market Scanner", { exact: true })).toBeVisible();
    // Real live data: at least one ranked USDT pair row should render.
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await expect(firstRow.locator("td").nth(1)).toContainText("USDT");
  });
});

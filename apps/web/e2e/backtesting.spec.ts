import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("backtesting (historical replay via backtesting-engine service)", () => {
  test("page renders the form and an empty history, and rejects an inverted date range", async ({ page, request }) => {
    const email = `e2e-backtest-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Backtesting" }).click();
    await expect(page).toHaveURL(/\/dashboard\/backtesting$/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("New Backtest", { exact: true })).toBeVisible();
    await expect(page.getByText("No backtests run yet.")).toBeVisible();

    await page.getByLabel("Start Date").fill("2024-02-10");
    await page.getByLabel("End Date").fill("2024-02-01");
    await page.getByRole("button", { name: "Run Backtest" }).click();

    await expect(page.getByText("endDate must be after startDate.")).toBeVisible({ timeout: 15_000 });
  });
});

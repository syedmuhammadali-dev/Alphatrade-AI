import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("AI decisions and strategy engine (real data via trading-engine)", () => {
  test("AI Decisions page shows ranked opportunities with real reasoning", async ({ page, request }) => {
    const email = `e2e-decisions-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "AI Decisions" }).click();
    await expect(page).toHaveURL(/\/dashboard\/decisions$/);

    await expect(page.getByRole("main").getByText("AI Decisions", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("SCANNED")).toBeVisible();

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    // Every scanned symbol should show either an action badge (LONG/SHORT/NO_TRADE).
    await expect(firstRow.locator("span", { hasText: /LONG|SHORT|NO_TRADE/ }).first()).toBeVisible();
  });

  test("Strategy Engine page lists all four strategies and can toggle one off", async ({ page, request }) => {
    const email = `e2e-strategies-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Strategy Engine" }).click();
    await expect(page).toHaveURL(/\/dashboard\/strategies$/);

    await expect(page.getByText("TrendFollowingStrategy")).toBeVisible();
    await expect(page.getByText("BreakoutStrategy")).toBeVisible();
    await expect(page.getByText("MomentumStrategy")).toBeVisible();
    await expect(page.getByText("MeanReversionStrategy")).toBeVisible();

    // Client-side nav can land here before the client component finishes
    // hydrating (the button exists in the SSR'd DOM before React attaches
    // its onClick) — wait for the network to settle so the click below
    // actually reaches a live event handler.
    await page.waitForLoadState("networkidle");

    const card = page.getByTestId("strategy-card-MeanReversionStrategy");
    await expect(card.getByText("ENABLED")).toBeVisible();
    await card.getByRole("button", { name: "Disable" }).click();
    await expect(card.getByText("DISABLED")).toBeVisible();
  });
});

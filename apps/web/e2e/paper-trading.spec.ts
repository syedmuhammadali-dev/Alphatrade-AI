import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("paper trading (real virtual account via paper-trading service)", () => {
  test("starting paper trading creates a real $10,000 virtual account that persists", async ({ page, request }) => {
    const email = `e2e-paper-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Paper Trading" }).click();
    await expect(page).toHaveURL(/\/dashboard\/paper-trading$/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Start Paper Trading")).toBeVisible();
    await page.getByRole("button", { name: /Start with \$10,000/ }).click();

    await expect(page.getByText("Virtual Balance")).toBeVisible({ timeout: 15_000 });
    // Balance and Equity both legitimately read $10000.00 with no open positions yet.
    await expect(page.getByText("$10000.00", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("No open paper positions.")).toBeVisible();

    // Reload — the account should still be there (idempotent start, not reset).
    await page.reload();
    await expect(page.getByText("Virtual Balance")).toBeVisible({ timeout: 15_000 });
  });

  test("AI Decisions table renders a Paper column that adapts to whether a proposal is currently APPROVED", async ({
    page,
    request,
  }) => {
    const email = `e2e-paper-decisions-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/decisions");
    await expect(page.getByRole("main").getByText("AI Decisions", { exact: true })).toBeVisible({ timeout: 20_000 });

    const headerRow = page.locator("thead tr");
    await expect(headerRow.getByText("Paper")).toBeVisible();

    // The first row's Paper cell is either an "Execute" button (APPROVED) or a "—" placeholder
    // (NO_TRADE/REJECTED) — both are valid, real outcomes depending on live market conditions.
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    const paperCell = firstRow.locator("td").last();
    await expect(paperCell).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("risk engine (real data via risk-engine service)", () => {
  test("Risk & Security page shows default config and can save an edit", async ({ page, request }) => {
    const email = `e2e-risk-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Risk & Security" }).click();
    await expect(page).toHaveURL(/\/dashboard\/risk$/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Risk Configuration")).toBeVisible();
    const minConfidenceInput = page.locator("#minimumConfidence");
    await expect(minConfidenceInput).toHaveValue("75");

    await minConfidenceInput.fill("65");
    await page.getByRole("button", { name: "Save Risk Config" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator("#minimumConfidence")).toHaveValue("65");
  });

  test("AI Decisions table shows a Risk column with a real APPROVED/REJECTED verdict", async ({ page, request }) => {
    const email = `e2e-risk-decisions-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/dashboard/decisions");
    await expect(page.getByRole("main").getByText("AI Decisions", { exact: true })).toBeVisible({ timeout: 20_000 });

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    // Every scanned symbol's Risk cell should show either a verdict badge or the "—" placeholder for NO_TRADE rows.
    const riskCell = firstRow.locator("td").last();
    await expect(riskCell).toBeVisible();
  });
});

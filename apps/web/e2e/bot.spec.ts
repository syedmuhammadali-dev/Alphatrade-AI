import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("autonomous bot controls", () => {
  test("start, pause, resume, and emergency stop move the bot through its real state machine", async ({ page, request }) => {
    const email = `e2e-bot-${randomUUID()}@example.com`;
    const password = "a-very-secure-e2e-password-1";
    await request.post("/api/auth/register", { data: { email, password } });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Autonomous Bot" }).click();
    await expect(page).toHaveURL(/\/dashboard\/bot$/);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("stopped", { exact: true })).toBeVisible();
    await page.getByRole("main").getByRole("button", { name: "Start Bot" }).click();
    await expect(page.getByText("running", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("main").getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByText("paused", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("main").getByRole("button", { name: "Resume" }).click();
    await expect(page.getByText("running", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("main").getByRole("button", { name: "Emergency Stop" }).click();
    await expect(page.getByText("emergency stopped", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("main").getByRole("button", { name: "Reset to Stopped" })).toBeVisible();
  });
});

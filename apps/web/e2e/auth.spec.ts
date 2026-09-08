import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

const PASSWORD = "a-very-secure-e2e-password-1";

function freshEmail() {
  return `e2e-${randomUUID()}@example.com`;
}

/** Seeds a user directly through the API (bypassing the UI) so tests that only care about
 *  post-login behavior don't depend on another test's UI flow having run first. */
async function registerViaApi(request: APIRequestContext, email: string, password: string) {
  const res = await request.post("/api/auth/register", { data: { email, password } });
  if (!res.ok()) {
    throw new Error(`Failed to seed user via API: ${res.status()} ${await res.text()}`);
  }
}

test.describe("auth flow (real browser, real API + Postgres)", () => {
  test("register redirects to dashboard and shows the terminal shell", async ({ page }) => {
    const email = freshEmail();

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: "Create your terminal account" })).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("AlphaTrade", { exact: true })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText("BOT STOPPED")).toBeVisible();
    await expect(page.getByText("Portfolio NAV")).toBeVisible();
    await expect(page.getByText("DEMO TELEMETRY", { exact: false })).toBeVisible();
  });

  test("logging in redirects to the dashboard, and / redirects an authenticated session there too", async ({
    page,
    request,
  }) => {
    const email = freshEmail();
    await registerViaApi(request, email, PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("unauthenticated visitors are redirected away from the dashboard", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logging out clears the session and redirects to login", async ({ page, request }) => {
    const email = freshEmail();
    await registerViaApi(request, email, PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: /Sign out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows an error for an incorrect password", async ({ page, request }) => {
    const email = freshEmail();
    await registerViaApi(request, email, PASSWORD);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("totally-wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("rejects registering the same email twice", async ({ page, request }) => {
    const email = freshEmail();
    await registerViaApi(request, email, PASSWORD);

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});

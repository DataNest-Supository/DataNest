import { expect, test } from "@playwright/test";

const appPath = process.env.DATANEST_APP_PATH || "/";

test("renders the signed-out application without uncaught browser errors", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(appPath);
  await expect(page.getByRole("heading", { name: "Resonance DataNest" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("shows a recoverable configuration error", async ({ page }) => {
  await page.route("**/runtime-config.js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.__DATANEST_CONFIG__={supabaseUrl:'',supabasePublishableKey:''};"
    });
  });

  await page.goto(appPath);
  await expect(page.getByText("Public Supabase runtime configuration is missing.")).toBeVisible();
});

test("failed authentication clears the busy state and reports an error", async ({ page }) => {
  await page.route("**/auth/v1/**", async (route) => {
    await route.abort("failed");
  });

  await page.goto(appPath);
  await page.getByLabel("Email").fill("smoke-test@example.invalid");
  await page.getByLabel("Password").fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.locator(".authMessage")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("keeps the sign-in interface usable on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(appPath);
  await expect(page.getByRole("heading", { name: "Resonance DataNest" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

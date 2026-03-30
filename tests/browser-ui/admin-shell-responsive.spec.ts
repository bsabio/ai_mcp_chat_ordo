import { expect, test, type Page, type Route } from "@playwright/test";

async function stubShellRequests(page: Page) {
  await page.route("**/api/preferences", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ preferences: [] }),
    });
  });

  await page.route("**/api/conversations/active", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conversationId: null }),
    });
  });
}

async function registerAndSimulateAdmin(page: Page) {
  const uniqueEmail = `admin-shell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Name").fill("Admin Shell User");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Password").fill("AdminShellPass123");
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.context().addCookies([
    {
      name: "lms_mock_session_role",
      value: "ADMIN",
      url: page.url(),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Admin shell responsive", () => {
  test("desktop sidebar exposes the full admin route set with preview status", async ({ page }) => {
    await stubShellRequests(page);
    await registerAndSimulateAdmin(page);

    await page.goto("/admin");

    const sidebar = page.getByLabel("Admin");

    await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Users preview" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "System preview" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Journal" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Leads preview" })).toBeVisible();

    await sidebar.getByRole("link", { name: "Users preview" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("bottom nav keeps parity with desktop and reaches preview routes", async ({ page }) => {
      await stubShellRequests(page);
      await registerAndSimulateAdmin(page);

      await page.goto("/admin");

      const mobileNav = page.getByLabel("Admin mobile");

      await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "Users preview" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "System preview" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "Journal" })).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "Leads preview" })).toBeVisible();

      await mobileNav.getByRole("link", { name: "Leads preview" }).click();
      await expect(page).toHaveURL(/\/admin\/leads$/);
      await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible();
    });
  });
});
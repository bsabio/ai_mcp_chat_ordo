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
  test("desktop admin uses the shared workspace menu without a duplicate sidebar", async ({ page }) => {
    await stubShellRequests(page);
    await registerAndSimulateAdmin(page);

    await page.goto("/admin");

    const nav = page.getByRole("navigation", { name: "Primary" });
    const trigger = page.locator('[data-shell-workspace-menu-trigger="true"]');

    await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
    await expect(page.locator('aside[aria-label="Admin"]')).toHaveCount(0);
    await expect(nav.getByRole("button", { name: "Open navigation menu" })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: "Open account menu" })).toHaveCount(0);
    await expect(trigger).toBeVisible();

    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Workspace menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Operations" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Content" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Governance" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Platform" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Users" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Leads" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Journal" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Prompts" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Conversations" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Global Jobs" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "System" })).toBeVisible();

    await dialog.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("mobile admin pages expose the shared workspace menu", async ({ page }) => {
      await stubShellRequests(page);
      await registerAndSimulateAdmin(page);

      await page.goto("/admin");

      await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
      await expect(page.locator('[data-admin-shell="true"]')).toBeVisible();
      await expect(page.locator('aside[aria-label="Admin"]')).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Open navigation menu" })).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Open account menu" })).toHaveCount(0);

      const trigger = page.locator('[data-shell-workspace-menu-trigger="true"]');
      await expect(trigger).toBeVisible();

      await trigger.click();

      const dialog = page.getByRole("dialog", { name: "Workspace menu" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Overview" })).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Operations" })).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Content" })).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Governance" })).toBeVisible();
      await expect(dialog.getByRole("heading", { name: "Platform" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Leads" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Conversations" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "My Jobs" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Global Jobs" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Journal" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Users" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Prompts" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "System" })).toBeVisible();

      await dialog.getByRole("link", { name: "Global Jobs" }).click();
      await expect(page).toHaveURL(/\/admin\/jobs$/);
      await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Workspace menu" })).toHaveCount(0);
    });

    test("mobile admin sub-workspaces use the drawer instead of a duplicate in-page rail", async ({ page }) => {
      await stubShellRequests(page);
      await registerAndSimulateAdmin(page);

      await page.goto("/admin/leads?view=attention");
      await expect(page.locator(".admin-workspace-nav")).toHaveCount(0);

      await page.locator('[data-shell-workspace-menu-trigger="true"]').click();

      const leadsDialog = page.getByRole("dialog", { name: "Workspace menu" });
      await expect(leadsDialog.getByRole("heading", { name: "Current workspace" })).toBeVisible();
      await expect(leadsDialog.getByRole("link", { name: "Pipeline" })).toBeVisible();
      await expect(leadsDialog.getByRole("link", { name: "Attention" })).toBeVisible();
      await leadsDialog.getByRole("link", { name: "Pipeline" }).click();
      await expect(page).toHaveURL(/\/admin\/leads(?:$|\?)/);

      await page.goto("/admin/journal/attribution");
      await expect(page.locator(".admin-workspace-nav")).toHaveCount(0);

      await page.locator('[data-shell-workspace-menu-trigger="true"]').click();

      const journalDialog = page.getByRole("dialog", { name: "Workspace menu" });
      await expect(journalDialog.getByRole("heading", { name: "Current workspace" })).toBeVisible();
      await expect(journalDialog.getByRole("link", { name: "Inventory" })).toBeVisible();
      await expect(journalDialog.getByRole("link", { name: "Attribution" })).toBeVisible();
      await journalDialog.getByRole("link", { name: "Inventory" }).click();
      await expect(page).toHaveURL(/\/admin\/journal$/);
    });
  });
});
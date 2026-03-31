import { expect, test } from "@playwright/test";

test.describe("Home shell header", () => {
  test("desktop home keeps shared search with the unified right-side utility cluster", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Primary" });

    await expect(nav.getByRole("link", { name: /Studio Ordo home/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Open notifications" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Open workspace menu" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Open navigation menu" })).toHaveCount(0);
    await expect(page.getByLabel("Search pages and accessible content")).toBeVisible();
    await expect(page.getByRole("button", { name: "Open search" })).toHaveCount(0);

    await nav.getByRole("button", { name: "Open workspace menu" }).click();

    const dialog = page.getByRole("dialog", { name: "Workspace menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Library" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Blog" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Register" })).toBeVisible();
  });

  test("desktop library keeps search but uses the same unified right-side workspace menu", async ({ page }) => {
    await page.goto("/library");

    const nav = page.getByRole("navigation", { name: "Primary" });

    await expect(nav.getByRole("link", { name: /Studio Ordo home/i })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Open notifications" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Open workspace menu" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Open navigation menu" })).toHaveCount(0);
    await expect(nav.getByRole("button", { name: "Open account menu" })).toHaveCount(0);
    await expect(page.getByLabel("Search pages and accessible content")).toBeVisible();

    await nav.getByRole("button", { name: "Open workspace menu" }).click();

    const dialog = page.getByRole("dialog", { name: "Workspace menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Library" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Blog" })).toBeVisible();
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("mobile home avoids split nav surfaces and keeps one workspace trigger", async ({ page }) => {
      await page.goto("/");

      const nav = page.getByRole("navigation", { name: "Primary" });

      await expect(nav.getByRole("button", { name: "Open notifications" })).toBeVisible();
      await expect(nav.getByRole("button", { name: "Open workspace menu" })).toBeVisible();
      await expect(nav.getByRole("button", { name: "Open navigation menu" })).toHaveCount(0);
      await expect(nav.getByRole("button", { name: "Open account menu" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Open search" })).toHaveCount(0);

      await nav.getByRole("button", { name: "Open workspace menu" }).click();

      const dialog = page.getByRole("dialog", { name: "Workspace menu" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Library" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Blog" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Sign In" })).toBeVisible();
      await expect(dialog.getByRole("link", { name: "Register" })).toBeVisible();

      await dialog.getByRole("link", { name: "Library" }).click();

      await expect(page).toHaveURL(/\/library$/);
      await expect(page.getByRole("dialog", { name: "Workspace menu" })).toHaveCount(0);
    });

    test("mobile library keeps a single workspace trigger and no legacy drawer split", async ({ page }) => {
      await page.goto("/library");

      const nav = page.getByRole("navigation", { name: "Primary" });

      await expect(nav.getByRole("button", { name: "Open notifications" })).toBeVisible();
      await expect(nav.getByRole("button", { name: "Open workspace menu" })).toBeVisible();
      await expect(nav.getByRole("button", { name: "Open navigation menu" })).toHaveCount(0);
      await expect(nav.getByRole("button", { name: "Open account menu" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Open search" })).toHaveCount(0);
      await expect(page.getByLabel("Search pages and accessible content")).toHaveCount(0);
    });
  });
});
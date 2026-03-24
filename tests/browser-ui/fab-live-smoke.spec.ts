import { expect, test } from "@playwright/test";

test.describe("FAB live smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens on /library and survives the first workflow chip path", async ({ page }) => {
    await page.goto("/library");

    await expect(page.getByRole("button", { name: "Open Studio Ordo chat" })).toBeVisible();

    await page.getByRole("button", { name: "Open Studio Ordo chat" }).click();

    await expect(page.locator('[data-chat-floating-shell="true"]')).toBeVisible();
    await expect(page.locator('[data-chat-composer-helper="true"]')).toContainText(
      "Enter to send. Shift+Enter for a line break.",
    );
    await expect(page.getByRole("button", { name: "Audit this workflow" })).toBeVisible();

    await page.getByRole("button", { name: "Audit this workflow" }).click();

    await expect(page.locator('[data-chat-floating-shell="true"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Start a new chat" })).toBeVisible();
    await expect(page.getByText("Audit this workflow")).toBeVisible();

    await expect
      .poll(async () => {
        return page.locator('[data-chat-floating-shell="true"] button').evaluateAll((buttons) => {
          return buttons
            .map((button) => button.textContent?.trim() ?? "")
            .filter((label) => {
              return (
                label.length > 0 &&
                !/^(New chat|Enter Full Screen|Minimize Chat|Attach file|Send)$/i.test(label)
              );
            }).length;
        });
      }, { timeout: 15000 })
      .toBeGreaterThan(1);
  });
});
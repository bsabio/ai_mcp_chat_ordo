import { expect, test } from "@playwright/test";

test.describe("Public reading tablet layout", () => {
  test.use({ viewport: { width: 834, height: 1112 } });

  test("library reading keeps contents available without crowding the header on tablet", async ({ page }) => {
    await page.goto("/library/ui-design/ch00-the-thread");

    await expect(page.locator('[data-library-reading-header="true"]')).toBeVisible();
    await expect(page.locator('[data-library-sidebar="true"]')).toBeVisible();
    await expect(page.locator('[data-library-reading-sequence="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-reading-support="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-reading-chapter-label="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-sidebar-progress="true"]')).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const tabletLinks = Array.from(document.querySelectorAll('[data-library-sidebar-link="true"]'));
      const sidebarTheme = document.querySelector('[data-library-sidebar-theme="true"]');
      const title = document.querySelector('[data-library-reading-title="true"]');
      const bookCount = document.querySelector('[data-library-sidebar-count="true"]');

      if (tabletLinks.length < 2) {
        return null;
      }

      const first = tabletLinks[0];
      const second = tabletLinks[1];

      if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) {
        return null;
      }

      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      const firstLinkLabel = first.querySelector('.library-sidebar-link-index');
      const firstLinkTitle = first.querySelector('.library-sidebar-link-title');

      return {
        linkCount: tabletLinks.length,
        titleText: title?.textContent?.trim() ?? "",
        bookCountText: bookCount?.textContent?.trim() ?? "",
        firstLinkLabelText: firstLinkLabel?.textContent?.trim() ?? "",
        firstLinkTitleText: firstLinkTitle?.textContent?.trim() ?? "",
        documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        viewportWidth: window.innerWidth,
        firstTop: firstRect.top,
        secondTop: secondRect.top,
        firstLeft: firstRect.left,
        secondLeft: secondRect.left,
        sidebarThemeDisplay: sidebarTheme instanceof HTMLElement ? getComputedStyle(sidebarTheme).display : null,
      };
    });

    expect(metrics).not.toBeNull();

    if (!metrics) {
      throw new Error("Tablet sidebar metrics were unavailable.");
    }

    expect(metrics.linkCount).toBeGreaterThanOrEqual(2);
    expect(metrics.titleText).toBe("The Thread: From Craft to Component");
    expect(metrics.bookCountText).toBe("10 chapters");
    expect(metrics.firstLinkLabelText).toBe("00");
    expect(metrics.firstLinkTitleText).toBe("The Thread: From Craft to Component");
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(Math.abs(metrics.firstTop - metrics.secondTop)).toBeLessThanOrEqual(16);
    expect(metrics.secondLeft).toBeGreaterThan(metrics.firstLeft + 120);
    expect(metrics.sidebarThemeDisplay).not.toBe("none");
  });
});
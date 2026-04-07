import { expect, test } from "@playwright/test";

test.describe("Public reading desktop layout", () => {
  test.use({ viewport: { width: 1181, height: 768 } });

  test("library reading prioritizes title and contents on desktop", async ({ page }) => {
    await page.goto("/library/ui-design/ch00-the-thread");

    await expect(page.locator('[data-library-reading-header="true"]')).toBeVisible();
    await expect(page.locator('[data-library-sidebar="true"]')).toBeVisible();
    await expect(page.locator('[data-library-reading-title="true"]')).toBeVisible();
    await expect(page.locator('[data-library-reading-body="true"] h1')).toHaveCount(0);
    await expect(page.locator('[data-library-reading-sequence="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-reading-support="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-reading-chapter-label="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-reading-progress="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-sidebar-current-title="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-sidebar-current-sequence="true"]')).toHaveCount(0);
    await expect(page.locator('[data-library-sidebar-progress="true"]')).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const header = document.querySelector('[data-library-reading-header="true"]');
      const title = document.querySelector('[data-library-reading-title="true"]');
      const body = document.querySelector('[data-library-reading-body="true"]');
      const bookCount = document.querySelector('[data-library-sidebar-count="true"]');
      const sidebarLinks = Array.from(document.querySelectorAll('[data-library-sidebar-link="true"]'));
      const sidebarTheme = document.querySelector('[data-library-sidebar-theme="true"]');

      if (!(header instanceof HTMLElement) || !(title instanceof HTMLElement) || !(body instanceof HTMLElement) || sidebarLinks.length < 2) {
        return null;
      }

      const firstSidebarLink = sidebarLinks[0];
      const secondSidebarLink = sidebarLinks[1];

      if (!(firstSidebarLink instanceof HTMLElement) || !(secondSidebarLink instanceof HTMLElement)) {
        return null;
      }

      const headerRect = header.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const firstSidebarRect = firstSidebarLink.getBoundingClientRect();
      const secondSidebarRect = secondSidebarLink.getBoundingClientRect();
      const firstSidebarLabel = firstSidebarLink.querySelector('.library-sidebar-link-index');
      const firstSidebarTitle = firstSidebarLink.querySelector('.library-sidebar-link-title');
      const currentSidebarTitle = document.querySelector('[data-library-sidebar-link="true"][aria-current="page"] .library-sidebar-link-title');

      return {
        titleFontSize: Number.parseFloat(getComputedStyle(title).fontSize),
        titleText: title.textContent?.trim() ?? "",
        bookCountText: bookCount?.textContent?.trim() ?? "",
        firstSidebarLabelText: firstSidebarLabel?.textContent?.trim() ?? "",
        firstSidebarTitleText: firstSidebarTitle?.textContent?.trim() ?? "",
        currentSidebarTitleText: currentSidebarTitle?.textContent?.trim() ?? "",
        headerBottom: headerRect.bottom,
        bodyTop: bodyRect.top,
        viewportHeight: window.innerHeight,
        sidebarColumnOffset: Math.abs(secondSidebarRect.left - firstSidebarRect.left),
        sidebarRowGap: secondSidebarRect.top - firstSidebarRect.top,
        sidebarThemeDisplay: sidebarTheme instanceof HTMLElement ? getComputedStyle(sidebarTheme).display : null,
        documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        viewportWidth: window.innerWidth,
      };
    });

    expect(metrics).not.toBeNull();

    if (!metrics) {
      throw new Error("Library desktop layout metrics were unavailable.");
    }

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(metrics.titleFontSize).toBeGreaterThanOrEqual(60);
    expect(metrics.titleText).toBe("The Thread: From Craft to Component");
    expect(metrics.bookCountText).toBe("10 chapters");
    expect(metrics.firstSidebarLabelText).toBe("00");
    expect(metrics.firstSidebarTitleText).toBe("The Thread: From Craft to Component");
    expect(metrics.currentSidebarTitleText).toBe("The Thread: From Craft to Component");
    expect(metrics.bodyTop).toBeLessThanOrEqual(metrics.viewportHeight + 32);
    expect(metrics.bodyTop).toBeGreaterThan(metrics.headerBottom - 12);
    expect(metrics.sidebarColumnOffset).toBeLessThanOrEqual(24);
    expect(metrics.sidebarRowGap).toBeGreaterThanOrEqual(24);
    expect(metrics.sidebarThemeDisplay).not.toBe("none");
  });

  test("journal reading keeps the body in reach on desktop", async ({ page }) => {
    await page.goto("/journal");

    const firstEntry = page
      .locator('[data-journal-role="lead-entry"], [data-journal-entry-tone="essay"], [data-journal-entry-tone="briefing"]')
      .first();

    await expect(firstEntry).toBeVisible();
    await firstEntry.click();

    await expect(page.locator('[data-journal-role="article-header"]')).toBeVisible();
    await expect(page.locator('[data-journal-role="article-body"]')).toBeVisible();
    await expect(page.locator('[data-journal-role="article-body"] h1')).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const headerTitle = document.querySelector('[data-journal-role="article-header"] h1');
      const standfirst = document.querySelector('[data-journal-role="article-standfirst"]');
      const body = document.querySelector('[data-journal-role="article-body"]');
      const opening = document.querySelector('[data-journal-role="article-body-opening"]');
      const hero = document.querySelector('[data-journal-role="article-hero"]');

      if (!(headerTitle instanceof HTMLElement) || !(body instanceof HTMLElement)) {
        return null;
      }

      const titleRect = headerTitle.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const standfirstRect = standfirst instanceof HTMLElement ? standfirst.getBoundingClientRect() : null;
      const openingRect = opening instanceof HTMLElement ? opening.getBoundingClientRect() : null;
      const heroRect = hero instanceof HTMLElement ? hero.getBoundingClientRect() : null;

      return {
        documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        titleFontSize: Number.parseFloat(getComputedStyle(headerTitle).fontSize),
        titleBottom: titleRect.bottom,
        standfirstTop: standfirstRect?.top ?? null,
        standfirstWidth: standfirstRect?.width ?? null,
        bodyTop: bodyRect.top,
        bodyWidth: bodyRect.width,
        openingTop: openingRect?.top ?? null,
        heroTop: heroRect?.top ?? null,
      };
    });

    expect(metrics).not.toBeNull();

    if (!metrics) {
      throw new Error("Journal desktop layout metrics were unavailable.");
    }

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
    expect(metrics.titleFontSize).toBeGreaterThanOrEqual(50);
    expect(metrics.bodyTop).toBeLessThanOrEqual(metrics.viewportHeight + 16);
    expect(metrics.bodyWidth).toBeGreaterThanOrEqual(840);

    if (metrics.standfirstTop != null) {
      expect(metrics.standfirstTop - metrics.titleBottom).toBeLessThanOrEqual(180);
    }

    if (metrics.standfirstWidth != null) {
      expect(metrics.standfirstWidth).toBeGreaterThanOrEqual(560);
    }

    if (metrics.openingTop != null) {
      expect(metrics.openingTop).toBeLessThanOrEqual(metrics.viewportHeight + 24);
    }

    if (metrics.openingTop != null && metrics.heroTop != null) {
      expect(metrics.openingTop).toBeLessThan(metrics.heroTop);
    }
  });
});
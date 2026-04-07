import { expect, test } from "@playwright/test";

const mobileViewports = [
  { name: "390x844", viewport: { width: 390, height: 844 } },
  { name: "430x932", viewport: { width: 430, height: 932 } },
] as const;

for (const scenario of mobileViewports) {
  test.describe(`Mobile home and library density ${scenario.name}`, () => {
    test.use({ viewport: scenario.viewport });

    test("home keeps route identity and composer inside the first viewport", async ({ page }) => {
      await page.goto("/");

      await expect(page.locator('[data-homepage-chat-intro="true"]')).toBeVisible();
      await expect(page.locator('[data-chat-composer-form="true"]')).toBeVisible();
      await expect(page.locator('[data-chat-fab-launcher="true"]')).toHaveCount(0);

      const metrics = await page.evaluate(() => {
        const intro = document.querySelector('[data-homepage-chat-intro="true"]');
        const composer = document.querySelector('[data-chat-composer-form="true"]');

        return {
          composerBottom: composer?.getBoundingClientRect().bottom ?? null,
          introTop: intro?.getBoundingClientRect().top ?? null,
          scrollWidth: document.body.scrollWidth,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        };
      });

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
      expect(metrics.introTop).not.toBeNull();
      expect(metrics.composerBottom).not.toBeNull();

      if (metrics.introTop == null || metrics.composerBottom == null) {
        throw new Error("Home route density metrics were not available.");
      }

      expect(metrics.introTop).toBeGreaterThanOrEqual(0);
      expect(metrics.composerBottom).toBeLessThanOrEqual(metrics.viewportHeight + 8);
    });

    test("library keeps compact cards and a clear floating-chat lane", async ({ page }) => {
      await page.goto("/library");

      const cards = page.locator('[data-library-book-card="true"]');

      await expect(cards.first()).toBeVisible();
      await expect(page.locator('[data-chat-fab-launcher="true"]')).toBeVisible();

      const cardDensity = await cards.first().evaluate((node) => {
        const styles = getComputedStyle(node);

        return {
          minHeight: Number.parseFloat(styles.minHeight),
          paddingTop: Number.parseFloat(styles.paddingTop),
        };
      });

      expect(cardDensity.minHeight).toBeLessThanOrEqual(180);
      expect(cardDensity.paddingTop).toBeLessThanOrEqual(16.5);

      const mainClearance = await page.locator('[data-shell-main-surface="default"][data-shell-floating-chat-clearance="true"]').evaluate((node) => {
        return Number.parseFloat(getComputedStyle(node).paddingBottom);
      });

      expect(mainClearance).toBeGreaterThanOrEqual(72);

      await page.evaluate(() => {
        document.body.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as ScrollBehavior });
      });

      const overlapMetrics = await page.evaluate(() => {
        const cardsInView = Array.from(document.querySelectorAll('[data-library-book-card="true"]'));
        const lastCard = cardsInView.at(-1);
        const launcher = document.querySelector('[data-chat-fab-launcher="true"]');

        return {
          bodyScrollTop: document.body.scrollTop,
          lastCardBottom: lastCard?.getBoundingClientRect().bottom ?? null,
          launcherTop: launcher?.getBoundingClientRect().top ?? null,
          scrollWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      expect(overlapMetrics.scrollWidth).toBeLessThanOrEqual(overlapMetrics.viewportWidth + 2);
      expect(overlapMetrics.bodyScrollTop).toBeGreaterThan(0);
      expect(overlapMetrics.lastCardBottom).not.toBeNull();
      expect(overlapMetrics.launcherTop).not.toBeNull();

      if (overlapMetrics.lastCardBottom == null || overlapMetrics.launcherTop == null) {
        throw new Error("Library route overlap metrics were not available.");
      }

      expect(overlapMetrics.lastCardBottom).toBeLessThanOrEqual(overlapMetrics.launcherTop - 8);
    });
  });
}
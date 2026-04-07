import Database from "better-sqlite3";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const mobileViewports = [
  { name: "360x800", viewport: { width: 360, height: 800 } },
  { name: "390x844", viewport: { width: 390, height: 844 } },
  { name: "430x932", viewport: { width: 430, height: 932 } },
] as const;

function getActiveReferralCode(): string {
  const dbPath = path.resolve(process.cwd(), ".data", "local.db");
  const db = new Database(dbPath, { readonly: true });

  try {
    const row = db.prepare(`
      SELECT referral_code
      FROM users
      WHERE affiliate_enabled = 1
        AND referral_code IS NOT NULL
      ORDER BY id
      LIMIT 1
    `).get() as { referral_code: string } | undefined;

    if (!row) {
      throw new Error("No active referral code is available in the local database.");
    }

    return row.referral_code;
  } finally {
    db.close();
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    documentWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    viewportWidth: window.innerWidth,
  }));

  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
}

async function measureElement(page: Page, selector: string) {
  return page.evaluate((currentSelector) => {
    const element = document.querySelector(currentSelector);

    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();

    return {
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      viewportHeight: window.innerHeight,
    };
  }, selector);
}

async function expectTitleAndPrimaryActionAboveFold(page: Page) {
  const titleMetrics = await measureElement(page, '[data-public-entry-title="true"]');
  const actionMetrics = await measureElement(page, '[data-public-entry-primary-action="true"]');

  expect(titleMetrics).not.toBeNull();
  expect(actionMetrics).not.toBeNull();

  if (!titleMetrics || !actionMetrics) {
    throw new Error("Public entry title or primary action metrics were unavailable.");
  }

  expect(titleMetrics.top).toBeGreaterThanOrEqual(0);
  expect(actionMetrics.bottom).toBeLessThanOrEqual(actionMetrics.viewportHeight + 8);
}

async function expectLauncherClearOf(page: Page, selector: string) {
  const launcher = page.locator('[data-chat-fab-launcher="true"]');

  if (await launcher.count() === 0) {
    return;
  }

  const metrics = await page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector);
    const launcherElement = document.querySelector('[data-chat-fab-launcher="true"]');

    if (!target || !launcherElement) {
      return null;
    }

    return {
      targetBottom: target.getBoundingClientRect().bottom,
      launcherTop: launcherElement.getBoundingClientRect().top,
    };
  }, selector);

  expect(metrics).not.toBeNull();

  if (!metrics) {
    throw new Error("Floating chat clearance metrics were unavailable.");
  }

  expect(metrics.targetBottom).toBeLessThanOrEqual(metrics.launcherTop - 8);
}

for (const scenario of mobileViewports) {
  test.describe(`Mobile public entry and reading surfaces ${scenario.name}`, () => {
    test.use({ viewport: scenario.viewport });

    test("login and register keep the primary action inside the first viewport", async ({ page }) => {
      for (const route of ["/login", "/register"]) {
        await page.goto(route);

        await expect(page.locator('[data-public-entry-title="true"]')).toBeVisible();
        await expect(page.locator('[data-public-entry-primary-action="true"]')).toBeVisible();

        await expectNoHorizontalOverflow(page);
        await expectTitleAndPrimaryActionAboveFold(page);
        await expectLauncherClearOf(page, '[data-public-entry-primary-action="true"]');
      }
    });

    test("status and invalid referral routes keep recovery actions above the fold", async ({ page }) => {
      for (const route of ["/access-denied", "/r/missing-referral-code"]) {
        await page.goto(route);

        await expect(page.locator('[data-public-status-page="true"]')).toBeVisible();
        await expect(page.locator('[data-public-entry-title="true"]')).toBeVisible();
        await expect(page.locator('[data-public-entry-primary-action="true"]')).toBeVisible();

        await expectNoHorizontalOverflow(page);
        await expectTitleAndPrimaryActionAboveFold(page);
        await expectLauncherClearOf(page, '[data-public-entry-primary-action="true"]');
      }
    });

    test("active referral landing keeps the invitation and CTA above the fold", async ({ page }) => {
      const activeReferralCode = getActiveReferralCode();

      await page.goto(`/r/${activeReferralCode}`);

      await expect(page.locator('[data-referral-landing="true"]')).toBeVisible();
      await expect(page.locator('[data-referral-summary="true"]')).toBeVisible();

      await expectNoHorizontalOverflow(page);
      await expectTitleAndPrimaryActionAboveFold(page);
      await expectLauncherClearOf(page, '[data-public-entry-primary-action="true"]');
    });

    test("library reading reaches live content quickly and preserves footer clearance", async ({ page }) => {
      await page.goto("/library");
      await page.locator('[data-library-book-card="true"]').first().click();

      await expect(page).toHaveURL(/\/library\/[^/]+\/[^/]+$/);
      await expect(page.locator('[data-library-reading-header="true"]')).toBeVisible();
      await expect(page.locator('[data-library-sidebar="true"]')).toBeVisible();
      await expect(page.locator('[data-library-reading-body="true"]')).toBeVisible();
      await expect(page.locator('[data-library-reading-body="true"] h1')).toHaveCount(0);
      await expect(page.locator('[data-library-reading-sequence="true"]')).toHaveCount(0);
      await expect(page.locator('[data-library-reading-support="true"]')).toHaveCount(0);
      await expect(page.locator('[data-library-reading-chapter-label="true"]')).toHaveCount(0);
      await expect(page.locator('[data-library-sidebar-current-title="true"]')).toHaveCount(0);
      await expect(page.locator('[data-library-sidebar-current-sequence="true"]')).toHaveCount(0);
      await expect(page.locator('[data-library-sidebar-progress="true"]')).toHaveCount(0);

      await expectNoHorizontalOverflow(page);

      const bodyMetrics = await measureElement(page, '[data-library-reading-body="true"]');
      const sidebarMetrics = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('[data-library-sidebar-link="true"]'));
        const sidebarTheme = document.querySelector('[data-library-sidebar-theme="true"]');
        const title = document.querySelector('[data-library-reading-title="true"]');
        const bookCount = document.querySelector('[data-library-sidebar-count="true"]');

        if (links.length < 2) {
          return null;
        }

        const first = links[0];
        const second = links[1];

        if (!(first instanceof HTMLElement) || !(second instanceof HTMLElement)) {
          return null;
        }

        const firstRect = first.getBoundingClientRect();
        const secondRect = second.getBoundingClientRect();
        const firstLinkLabel = first.querySelector('.library-sidebar-link-index');
        const firstLinkTitle = first.querySelector('.library-sidebar-link-title');

        return {
          titleText: title?.textContent?.trim() ?? "",
          bookCountText: bookCount?.textContent?.trim() ?? "",
          firstLinkLabelText: firstLinkLabel?.textContent?.trim() ?? "",
          firstLinkTitleText: firstLinkTitle?.textContent?.trim() ?? "",
          firstTop: firstRect.top,
          secondTop: secondRect.top,
          firstLeft: firstRect.left,
          secondLeft: secondRect.left,
          sidebarThemeDisplay: sidebarTheme instanceof HTMLElement ? getComputedStyle(sidebarTheme).display : null,
        };
      });

      expect(bodyMetrics).not.toBeNull();
      expect(sidebarMetrics).not.toBeNull();

      if (!bodyMetrics || !sidebarMetrics) {
        throw new Error("Library reading metrics were unavailable.");
      }

      expect(bodyMetrics.top).toBeLessThanOrEqual(bodyMetrics.viewportHeight + 48);
        expect(sidebarMetrics.titleText).not.toMatch(/^Chapter\s+\d+\s*(?:—|-|:)/);
      expect(sidebarMetrics.bookCountText).toMatch(/^\d+ chapters$/);
        expect(sidebarMetrics.firstLinkLabelText).toMatch(/^\d{2}$/);
        expect(sidebarMetrics.firstLinkTitleText).not.toMatch(/^Chapter\s+\d+\s*(?:—|-|:)/);
      expect(Math.abs(sidebarMetrics.firstTop - sidebarMetrics.secondTop)).toBeLessThanOrEqual(16);
      expect(sidebarMetrics.secondLeft).toBeGreaterThan(sidebarMetrics.firstLeft + 120);
      expect(sidebarMetrics.sidebarThemeDisplay).toBe("none");

      await page.locator('[data-library-reading-nav="true"]').scrollIntoViewIfNeeded();
      await expectLauncherClearOf(page, '[data-library-reading-nav="true"]');
    });

    test("journal index shows route identity and article inventory in the opening viewport", async ({ page }) => {
      await page.goto("/journal");

      await expect(page.locator('[data-journal-surface="intro-card"]')).toBeVisible();
      await expect(page.locator('[data-journal-role="lead-entry"]')).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const contentMetrics = await page.evaluate(() => {
        const firstContent = document.querySelector(
          '[data-journal-role="lead-entry"], [data-journal-entry-tone="essay"], [data-journal-entry-tone="briefing"], [data-journal-surface="empty-shell"]',
        );

        if (!firstContent) {
          return null;
        }

        const rect = firstContent.getBoundingClientRect();

        return {
          top: rect.top,
          viewportHeight: window.innerHeight,
        };
      });

      expect(contentMetrics).not.toBeNull();

      if (!contentMetrics) {
        throw new Error("Journal index content metrics were unavailable.");
      }

      expect(contentMetrics.top).toBeLessThanOrEqual(contentMetrics.viewportHeight + 8);

      const leadMetrics = await measureElement(page, '[data-journal-role="lead-entry"]');
      expect(leadMetrics).not.toBeNull();

      if (!leadMetrics) {
        throw new Error("Journal lead entry metrics were unavailable.");
      }

      expect(leadMetrics.height).toBeLessThanOrEqual(leadMetrics.viewportHeight * 0.66);
    });

    test("journal articles reach the body within one short header stack", async ({ page }) => {
      await page.goto("/journal");

      const firstEntry = page.locator('[data-journal-role="lead-entry"], [data-journal-entry-tone="essay"], [data-journal-entry-tone="briefing"]').first();

      await expect(firstEntry).toBeVisible();
      await firstEntry.click();

      await expect(page.locator('[data-journal-role="article-header"]')).toBeVisible();
      await expect(page.locator('[data-journal-role="article-body"]')).toBeVisible();
      await expect(page.locator('[data-journal-role="article-body"] h1')).toHaveCount(0);

      await expectNoHorizontalOverflow(page);

      const openingBodyMetrics = await measureElement(page, '[data-journal-role="article-body-opening"]');
      const bodyMetrics = await measureElement(page, '[data-journal-role="article-body"]');
      const heroMetrics = await measureElement(page, '[data-journal-role="article-hero"]');
      expect(bodyMetrics).not.toBeNull();

      if (!bodyMetrics) {
        throw new Error("Journal article body metrics were unavailable.");
      }

      const firstReadableContentMetrics = openingBodyMetrics ?? bodyMetrics;
      expect(firstReadableContentMetrics.top).toBeLessThanOrEqual(firstReadableContentMetrics.viewportHeight + 16);

      if (openingBodyMetrics && heroMetrics) {
        expect(openingBodyMetrics.top).toBeLessThanOrEqual(openingBodyMetrics.viewportHeight + 8);
        expect(openingBodyMetrics.top).toBeLessThan(heroMetrics.top);
      }
    });
  });
}
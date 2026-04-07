import type { Page } from "@playwright/test";

const REGISTER_FORM_STARTED_AT_FIELD = "formStartedAt";

export async function backdateRegisterFormStart(page: Page, offsetMs = 2_000) {
  await page.route("**/api/auth/register", async (route) => {
    const postData = route.request().postData();

    if (!postData) {
      await route.continue();
      return;
    }

    try {
      const payload = JSON.parse(postData) as Record<string, unknown>;
      payload[REGISTER_FORM_STARTED_AT_FIELD] = String(Date.now() - offsetMs);
      await route.continue({ postData: JSON.stringify(payload) });
    } catch {
      await route.continue();
    }
  });
}

export async function finishRegisterNavigation(page: Page, fallbackHref = "/") {
  try {
    await page.waitForURL(/\/$/, { timeout: 5_000 });
  } catch {
    await page.goto(fallbackHref);
  }
}
import type { Page } from "@playwright/test";

const REGISTER_FORM_STARTED_AT_FIELD = "formStartedAt";
const SESSION_COOKIE_NAME = "lms_session_token";

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
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const hasSessionCookie = (await page.context().cookies()).some((cookie) => cookie.name === SESSION_COOKIE_NAME);
    const currentUrl = new URL(page.url());

    if (hasSessionCookie && currentUrl.pathname !== "/register") {
      await page.waitForLoadState("networkidle");
      return;
    }

    if (hasSessionCookie && currentUrl.pathname === "/register") {
      await page.goto(fallbackHref);
      await page.waitForLoadState("networkidle");
      return;
    }

    await page.waitForTimeout(200);
  }

  await page.goto(fallbackHref);
  await page.waitForLoadState("networkidle");
}
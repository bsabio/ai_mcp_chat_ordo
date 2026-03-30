import { expect, test } from "@playwright/test";

test.describe("Push notifications", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("registers browser push after sign-up and allows disabling it from profile", async ({ page }) => {
    let pushPostCount = 0;
    let pushDeleteCount = 0;

    await page.addInitScript(() => {
      const pushHarness = {
        registerCalls: 0,
        subscribeCalls: 0,
        requestPermissionCalls: 0,
      };

      let currentSubscription: {
        endpoint: string;
        unsubscribe: () => Promise<boolean>;
        toJSON: () => {
          endpoint: string;
          expirationTime: null;
          keys: { p256dh: string; auth: string };
        };
      } | null = null;

      Object.defineProperty(window, "__pushHarness", {
        configurable: true,
        value: pushHarness,
      });

      Object.defineProperty(window, "PushManager", {
        configurable: true,
        value: class PushManager {},
      });

      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
          permission: "default",
          requestPermission: async () => {
            pushHarness.requestPermissionCalls += 1;
            return "granted";
          },
        },
      });

      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
          register: async () => {
            pushHarness.registerCalls += 1;
            return {
              pushManager: {
                getSubscription: async () => currentSubscription,
                subscribe: async () => {
                  pushHarness.subscribeCalls += 1;
                  currentSubscription = {
                    endpoint: "https://push.example/sub_1",
                    unsubscribe: async () => true,
                    toJSON: () => ({
                      endpoint: "https://push.example/sub_1",
                      expirationTime: null,
                      keys: {
                        p256dh: "p256dh-key",
                        auth: "auth-key",
                      },
                    }),
                  };
                  return currentSubscription;
                },
              },
            };
          },
        },
      });
    });

    await page.route("**/api/notifications/push", async (route) => {
      if (route.request().method() === "POST") {
        pushPostCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ subscription: { endpoint: "https://push.example/sub_1" } }),
        });
        return;
      }

      if (route.request().method() === "DELETE") {
        pushDeleteCount += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/register");

    const uniqueEmail = `push-audit-${Date.now()}@example.com`;
    await page.getByLabel("Name").fill("Push Audit User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("AuditPass123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => pushPostCount, { timeout: 10000 }).toBe(1);
    await expect
      .poll(() => page.evaluate(() => (window as Window & { __pushHarness?: { registerCalls: number; subscribeCalls: number; requestPermissionCalls: number } }).__pushHarness))
      .toMatchObject({
        registerCalls: 1,
        subscribeCalls: 1,
        requestPermissionCalls: 1,
      });

    await page.goto("/profile");
    await expect(page.getByRole("button", { name: "Disable notifications" })).toBeVisible();
    await page.getByRole("button", { name: "Disable notifications" }).click();

    await expect(page.getByText("Push notifications disabled for your account.")).toBeVisible();
    await expect.poll(() => pushDeleteCount, { timeout: 10000 }).toBe(1);
    await expect(page.getByRole("button", { name: "Enable notifications" })).toBeVisible();
  });
});
import { defineConfig } from "@playwright/test";

const playwrightPort = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "34123", 10);
const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${playwrightPort}`;
const playwrightPushPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY
  ?? "BEl6bnlQdWJsaWNLZXlGb3JUZXN0aW5nMTIzNDU2Nzg";

export default defineConfig({
  testDir: ".",
  testMatch: ["tests/browser-ui/**/*.spec.ts"],
  testIgnore: ["**/.next/**"],
  fullyParallel: false,
  reporter: [["list"]],
  webServer: {
    command: `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=${playwrightPushPublicKey} npm run build && DATA_DIR=.playwright-data HOSTNAME=127.0.0.1 PORT=${playwrightPort} DISABLE_DEFERRED_JOB_WORKER=1 REFERRAL_COOKIE_SECRET=playwright-referral-secret JWT_SECRET=playwright-referral-secret NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=${playwrightPushPublicKey} node scripts/start-server.mjs`,
    url: playwrightBaseUrl,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 240_000,
  },
  use: {
    baseURL: playwrightBaseUrl,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
});
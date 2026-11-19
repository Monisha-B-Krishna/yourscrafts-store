import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the two journeys that matter most: buying something, and the
 * owner running the shop from /admin. Run with `npm run test:e2e` — see tests/e2e/README.md.
 */
loadEnvConfig(process.cwd());

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const isLocal = (url = "") => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url);

// Safety catch: these tests create accounts, products and paid orders.
// They must never run against the live shop or real Razorpay.
const problems = [
  !isLocal(process.env.NEXT_PUBLIC_SUPABASE_URL) && "NEXT_PUBLIC_SUPABASE_URL must be your local Supabase (http://127.0.0.1:54321)",
  !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY is missing",
  !process.env.ADMIN_EMAIL && "ADMIN_EMAIL is missing",
  !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") && "RAZORPAY_KEY_ID must be a TEST key (rzp_test_...)",
  process.env.RAZORPAY_API_BASE !== "http://127.0.0.1:54399/v1" && "RAZORPAY_API_BASE must be http://127.0.0.1:54399/v1",
  process.env.RESEND_API_BASE !== "http://127.0.0.1:54398" && "RESEND_API_BASE must be http://127.0.0.1:54398",
  !isLocal(BASE_URL) && "E2E_BASE_URL must be a local address",
].filter(Boolean);
if (problems.length) {
  throw new Error(`Browser tests need a local test setup (tests/e2e/README.md):\n  - ${problems.join("\n  - ")}`);
}

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // the journeys share one database
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Optional: use a Chrome/Chromium already on this computer instead of `npx playwright install`.
    ...(process.env.E2E_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } } : {}),
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /buy\.spec\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testMatch: /admin\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "node tests/e2e/support/fake-services.mjs",
      url: "http://127.0.0.1:54399/health",
      reuseExistingServer: true,
    },
    {
      // Builds and starts the shop unless one is already running on E2E_BASE_URL.
      command: "npm run build && npm run start",
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 300_000,
    },
  ],
});

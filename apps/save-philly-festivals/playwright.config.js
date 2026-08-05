import { randomBytes } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;
const producerE2ESecret = process.env.PRODUCER_E2E_SECRET || randomBytes(32).toString("hex");
process.env.PRODUCER_E2E_SECRET = producerE2ESecret;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: `next dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      AUTH_SECRET: process.env.AUTH_SECRET || "application-e2e-secret-not-for-production",
      AUTH_TRUST_HOST: "true",
      DISCOVERY_E2E_FIXTURE: "1",
      PRODUCER_E2E_FIXTURE: "1",
      PRODUCER_E2E_SECRET: producerE2ESecret,
      CURATOR_SOCIAL_FEED_TOKEN: "",
      FLOCKLER_SOCIAL_FEED_TOKEN: "",
      SOCIAL_FEED_SYNC_SECRET: "",
      NEXT_PUBLIC_SITE_URL: baseURL,
      DATABASE_URL:
        process.env.DATABASE_URL || "postgresql://e2e:e2e@127.0.0.1:5432/save_philly_festivals_e2e",
    },
  },
});

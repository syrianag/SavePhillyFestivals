import { randomBytes } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://localhost:${port}`;
const producerE2ESecret = process.env.PRODUCER_E2E_SECRET || randomBytes(32).toString("hex");
process.env.PRODUCER_E2E_SECRET = producerE2ESecret;

/* The release browser matrix is Chromium and Firefox at desktop widths.
 *
 * WebKit and the mobile projects were removed deliberately: WebKit needs host packages
 * (`playwright install-deps`) that neither this host nor the CI runner installs, so those projects
 * only ever produced launch failures rather than coverage. Keep this list in step with the
 * `playwright install` argument list in .github/workflows/ci-cd.yml — a project here with no
 * matching installed browser fails in milliseconds with "Executable doesn't exist".
 *
 * E2E_BROWSERS narrows the run further for a quick local pass. */
const allProjects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
];

const requestedBrowsers = (process.env.E2E_BROWSERS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const selectedProjects = requestedBrowsers.length
  ? allProjects.filter((project) => requestedBrowsers.includes(project.name))
  : allProjects;

if (requestedBrowsers.length && selectedProjects.length !== requestedBrowsers.length) {
  const known = allProjects.map((project) => project.name).join(", ");
  throw new Error(`E2E_BROWSERS contains an unknown project. Supported projects: ${known}.`);
}

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
  projects: selectedProjects,
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
      NAVIGATION_E2E_FIXTURE: "1",
      PRODUCER_E2E_FIXTURE: "1",
      PASSWORD_RESET_E2E_FIXTURE: "1",
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

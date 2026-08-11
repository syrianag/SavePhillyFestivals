import { expect, test } from "@playwright/test";

/* Matches `knownPasswordResetE2EEmail()` in the fixture. Every other address behaves as unknown. */
const KNOWN_EMAIL = "e2e-reset@example.test";

test("the login page offers a route out for a forgotten password", async ({ page }) => {
  await page.goto("/login");

  const link = page.getByRole("link", { name: "Forgot password?" });
  await expect(link).toBeVisible();
  await link.click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
});

test("requesting a reset for a registered address confirms without confirming the address", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(KNOWN_EMAIL);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(page.getByRole("status")).toContainText("If that address has an account");
  await expect(page.getByRole("status")).toContainText("expires in 30 minutes");
  /* The address must not be echoed back as confirmed — that would undo the endpoint's refusal to
   * distinguish registered from unregistered. */
  await expect(page.getByRole("status")).not.toContainText(KNOWN_EMAIL);
});

test("an unregistered address produces a byte-identical confirmation", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(KNOWN_EMAIL);
  await page.getByRole("button", { name: "Send reset link" }).click();
  const registered = await page.getByRole("status").textContent();

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("definitely-not-registered@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  const unregistered = await page.getByRole("status").textContent();

  // The enumeration property, asserted on what a visitor can actually see.
  expect(unregistered).toBe(registered);
});

test("a reset link with no token explains itself instead of rendering a dead form", async ({ page }) => {
  await page.goto("/reset-password");

  await expect(page.getByRole("heading", { name: "This link isn't valid" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request a new reset link" })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
});

test("a forged token is rejected by the server, not by the form", async ({ page }) => {
  await page.goto(`/reset-password?token=${"f".repeat(43)}`);

  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  await page.getByLabel("New password", { exact: true }).fill("correct-horse-battery");
  await page.getByLabel("Confirm new password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Set new password" }).click();

  /* Scoped to the form: a bare getByRole("alert") also matches Next's route announcer. */
  await expect(page.locator("form").getByRole("alert")).toContainText("no longer valid");
});

test("mismatched confirmation is caught before anything is sent", async ({ page }) => {
  await page.goto(`/reset-password?token=${"f".repeat(43)}`);

  await page.getByLabel("New password", { exact: true }).fill("correct-horse-battery");
  await page.getByLabel("Confirm new password").fill("correct-horse-bettery");
  await page.getByRole("button", { name: "Set new password" }).click();

  await expect(page.locator("form").getByRole("alert")).toContainText("don't match");
});

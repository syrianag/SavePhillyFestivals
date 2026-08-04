import { expect, test } from "@playwright/test";

test("home page renders festival discovery content", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Save Philly Festivals/i);
  await expect(page.getByRole("heading", { name: "About Philly Fests" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Featured" })).toBeVisible();
});

test("about page renders its mission", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("heading", { name: "About Philly Fest", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Our Mission" })).toBeVisible();
});

test("tours page renders available tour options", async ({ page }) => {
  await page.goto("/tours");

  await expect(page.getByRole("heading", { name: "City of Festivals Tours" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tour Options" })).toBeVisible();
});

test("login page renders the credentials form without contacting a provider", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Save Philly Festivals" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("unauthenticated admin access redirects to login with a callback", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL((url) => {
    return url.pathname === "/login" && url.searchParams.get("callbackUrl") === "/admin";
  });
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("unauthenticated session endpoint returns null", async ({ request }) => {
  const response = await request.get("/api/auth/session");

  expect(response.status()).toBe(200);
  expect(await response.json()).toBeNull();
});

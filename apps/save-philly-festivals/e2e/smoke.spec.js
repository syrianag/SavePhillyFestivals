import { expect, test } from "@playwright/test";

test("home page renders festival discovery content", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Save Philly Festivals/i);
  await expect(page.getByRole("heading", { name: "About Philly Fests" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Featured" })).toBeVisible();
  await expect(page.getByText("2 festivals found")).toBeVisible();
  await expect(page.getByRole("link", { name: "View Riverfront Arts Festival" })).toHaveAttribute("href", "/festivals/riverfront-arts-festival");
});

test("discovery controls reflect URL query state", async ({ page }) => {
  await page.goto("/?search=riverfront&date=custom&start=2026-09-12&end=2026-09-13&category=Art&neighborhood=Landing&sort=name");

  await expect(page.getByLabel("Search festivals")).toHaveValue("riverfront");
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("custom");
  await expect(page.getByLabel("Start date")).toHaveValue("2026-09-12");
  await expect(page.getByLabel("Category")).toHaveValue("Art");
  await expect(page.getByLabel("Neighborhood or location")).toHaveValue("Landing");
  await expect(page.getByLabel("Sort results")).toHaveValue("name");
  await expect(page.getByText("1 festival found")).toBeVisible();
});

test("discovery submits query state and renders intentional no-results content", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search festivals").fill("no such festival");
  await page.getByRole("button", { name: "Apply festival search and filters" }).click();

  await expect(page).toHaveURL(/q=no\+such\+festival/);
  await expect(page.getByRole("heading", { name: "No festivals match your search" })).toBeVisible();
  await expect(page.getByText("0 festivals found")).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear all filters" })).toHaveAttribute("href", "/");
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

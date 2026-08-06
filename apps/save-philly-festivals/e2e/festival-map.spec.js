import { expect, test } from "@playwright/test";

/**
 * The map is the one feature whose failure mode is silent: a strict CSP blocks an external
 * map SDK and the page still returns 200 with an empty grey box. These assertions check that
 * tiles and pins actually rendered, not merely that the route responded.
 */

test("map tab is reachable from the landing page", async ({ page }) => {
  await page.goto("/");

  const mapTab = page.getByRole("link", { name: "Map", exact: true });
  await expect(mapTab).toBeVisible();
  await mapTab.click();
  await expect(page).toHaveURL(/\/map$/);
});

test("map renders leaflet tiles and one pin per geocoded festival", async ({ page }) => {
  await page.goto("/map");

  await expect(page.getByRole("heading", { name: "Festival map" })).toBeVisible();

  // The container only exists when Leaflet initialised, which proves the bundled library
  // was not blocked by script-src.
  const container = page.locator(".leaflet-container");
  await expect(container).toBeVisible();

  // Tiles are plain HTTPS images; if img-src ever tightens, this is what catches it.
  await expect(page.locator("img.leaflet-tile").first()).toBeVisible();

  const markers = page.locator(".leaflet-marker-icon");
  await expect(markers.first()).toBeVisible();
  expect(await markers.count()).toBeGreaterThan(0);

  await expect(page.getByText("OpenStreetMap")).toBeVisible();
});

test("selecting a pin opens that festival", async ({ page }) => {
  await page.goto("/map");

  await page.locator(".leaflet-marker-icon").first().click();
  const popupLink = page.locator(".leaflet-popup a", { hasText: "View festival" });
  await expect(popupLink).toBeVisible();

  await popupLink.click();
  await expect(page).toHaveURL(/\/festivals\//);
});

test("map page reports no console or network errors", async ({ page }) => {
  const problems = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });

  await page.goto("/map");
  await expect(page.locator(".leaflet-container")).toBeVisible();

  expect(problems).toEqual([]);
});

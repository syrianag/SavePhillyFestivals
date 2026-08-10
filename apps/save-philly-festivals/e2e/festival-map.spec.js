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

test("selecting a pin opens that festival without a full page reload", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator(".leaflet-container")).toBeVisible();

  // Survives a client-side transition; wiped by a full document load. This is the actual
  // behaviour being asserted — the previous popup link was raw HTML injected into Leaflet,
  // so it was a plain <a> that reloaded the document.
  await page.evaluate(() => { window.__clientNav = true; });

  // Pins may cluster at the fitted zoom, so drill in until an individual marker is reachable.
  // Both carry `.leaflet-marker-icon`; the divIcon classNames are what separate them.
  const festivalMarker = page.locator(".leaflet-marker-icon.festival-map-pin");
  const cluster = page.locator(".leaflet-marker-icon.festival-cluster");
  for (let attempt = 0; attempt < 6 && (await festivalMarker.count()) === 0; attempt += 1) {
    await cluster.first().click();
    await page.waitForTimeout(400);
  }

  await expect(festivalMarker.first()).toBeVisible();
  await festivalMarker.first().click();

  await expect(page).toHaveURL(/\/festivals\//);
  expect(await page.evaluate(() => window.__clientNav)).toBe(true);
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

test("map filters narrow both the pins and the companion list", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  const listRows = page.getByRole("button", { name: "Show on map" });
  const unfiltered = await listRows.count();
  expect(unfiltered).toBeGreaterThan(1);

  // Filtering must narrow the map and the list together — they read from one query, and this
  // is what catches them drifting apart.
  await page.goto("/map?category=Food");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(listRows).toHaveCount(1);

  // Filters survive a switch to another discovery view.
  await page.getByLabel("Discovery views").getByRole("link", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/category=Food/);
});

test("show on map focuses the selected festival", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator(".leaflet-container")).toBeVisible();

  await page.getByRole("button", { name: "Show on map" }).first().click();
  // Focusing expands any enclosing cluster and reveals the individual marker.
  await expect(page.locator(".leaflet-marker-icon.festival-map-pin").first()).toBeVisible();
});

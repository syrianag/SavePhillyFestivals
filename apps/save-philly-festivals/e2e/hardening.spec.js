import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/calendar", "/about", "/privacy", "/terms"];

for (const route of publicRoutes) {
  test(`${route} has one main landmark and no horizontal page overflow`, async ({ page }) => {
    await page.goto(route);

    await expect(page.locator("main")).toHaveCount(1);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("skip link and discovery controls have accessible names", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  // Discovery on "/" is the server-rendered DiscoveryControls form.
  await expect(page.getByLabel("Search festivals")).toBeVisible();
  await expect(page.getByLabel("Date", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Category", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Neighborhood or location")).toBeVisible();
  await expect(page.getByLabel("Sort results")).toBeVisible();
});

test("calendar search and filter controls have accessible names", async ({ page }) => {
  await page.goto("/calendar");

  // The calendar view uses the interactive SearchBar component.
  await expect(page.getByLabel("Search festivals")).toBeVisible();
  await expect(page.getByLabel("Filter festivals by date")).toBeVisible();
  await expect(page.getByLabel("Filter festivals by type")).toBeVisible();
  await expect(page.getByLabel("Filter festivals by area")).toBeVisible();
});

test("calendar exposes selected-day and month-control semantics", async ({ page }, testInfo) => {
  // The month widget is intentionally desktop-only (`hidden ... lg:flex`).
  test.skip((testInfo.project.use.viewport?.width ?? 1280) < 1024, "Month widget is hidden below the lg breakpoint");
  await page.goto("/calendar");

  await expect(page.getByRole("button", { name: /show previous month/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /show next month/i })).toBeVisible();

  // The calendar loads unfiltered so it never opens pre-filtered to a day with no festivals.
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);

  // Navigate to the month holding the all-day fixture (September 2026).
  // Month-and-year only; the festival list's date headings carry a day number and a comma.
  const monthHeading = page.getByRole("heading", { level: 3, name: /^[A-Z][a-z]+ \d{4}$/ });
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if ((await monthHeading.textContent())?.trim() === "September 2026") break;
    await page.getByRole("button", { name: /show next month/i }).click();
  }
  await expect(monthHeading).toHaveText("September 2026");

  /* The day must advertise a festival before it is clicked. Asserting only on aria-pressed and
   * the Clear chip — both of which appear even when the filter matches nothing — is what let
   * the all-day day-key defect ship: every dot was one day away from its festival. */
  const day = page.getByRole("button", { name: /^September 15, 2026, festival scheduled$/ });
  await expect(day).toBeVisible();
  await day.click();
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /clear date/i })).toBeVisible();

  // The festival on that day is actually listed — the assertion the old spec was missing.
  await expect(page.getByRole("heading", { name: "Germantown Heritage Days" })).toBeVisible();

  /* The fixture spans Sept 15-16, so clicking its second day must find it too. A multi-day
   * festival used to match only its first day. */
  await day.click();
  const secondDay = page.getByRole("button", { name: /^September 16, 2026, festival scheduled$/ });
  await expect(secondDay).toBeVisible();
  await secondDay.click();
  await expect(page.getByRole("heading", { name: "Germantown Heritage Days" })).toBeVisible();

  // Selecting it again clears the filter, as does the Clear control.
  await secondDay.click();
  await expect(page.getByRole("button", { pressed: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /clear date/i })).toHaveCount(0);
});

test("mobile navigation reports and manages expanded state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await menuButton.click();
  await expect(page.getByRole("button", { name: "Close navigation menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeFocused();
});

test("public responses include baseline security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
});

test("footer contains only implemented destinations", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('footer a[href="#"]')).toHaveCount(0);
  await expect(page.locator('footer a[href="/resources"], footer a[href="/contact"]')).toHaveCount(0);
  await expect(page.locator('footer a[href="/privacy"]').first()).toBeVisible();
  await expect(page.locator('footer a[href="/terms"]').first()).toBeVisible();
});

import { expect, test } from "@playwright/test";

async function fixtureSignIn(page, as = "producer-a") {
  const secret = process.env.PRODUCER_E2E_SECRET;
  if (!secret) throw new Error("Playwright producer fixture secret is required.");
  await page.goto(`/producer/e2e-login?as=${encodeURIComponent(as)}&secret=${encodeURIComponent(secret)}&callbackUrl=${encodeURIComponent("/producer/dashboard")}`);
  await expect(page).toHaveURL(/\/producer\/dashboard$/);
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("F-07 producer submission", () => {
  test("legacy festival ID GET is approved-only and excludes private fields", async ({ request }) => {
    const approved = await request.get("/api/festivals/e2e-approved-1");
    expect(approved.status()).toBe(200);
    const body = await approved.json();
    expect(body).toMatchObject({ id: "e2e-approved-1", name: "Riverfront Arts Festival" });
    for (const forbidden of ["contact_email", "contact_phone", "contact_name", "owner_user_id", "submitted_by", "submission_key", "workflow_state", "revision"]) {
      expect(body).not.toHaveProperty(forbidden);
    }
    expect((await request.get("/api/festivals/non-public-draft")).status()).toBe(404);
    expect((await request.get("/api/festivals/non-public-pending")).status()).toBe(404);
  });

  test("management redirects unauthenticated users while producer marketing remains public", async ({ page }) => {
    await page.goto("/producer/festivals");
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("callbackUrl") === "/producer/festivals");

    await page.goto("/producer");
    await expect(page.getByRole("heading", { name: /Showcase your festival/i })).toBeVisible();

    /* Both entry points, and each pointing where it claims. Nothing covered the split when the
     * application flow replaced the single CTA, so renaming or re-pointing either one was free. */
    await expect(page.getByRole("link", { name: /Become a producer/i })).toHaveAttribute("href", "/producer/apply");
    await expect(page.getByRole("link", { name: "Resume a submission" })).toHaveAttribute("href", "/producer/submit");
  });

  test("fixture login fails closed and never accepts an external callback", async ({ page }) => {
    await page.goto("/producer/e2e-login");
    await expect(page.getByText("Not found")).toBeVisible();
    const secret = process.env.PRODUCER_E2E_SECRET;
    await page.goto(`/producer/e2e-login?secret=${encodeURIComponent(secret)}&callbackUrl=${encodeURIComponent("https://evil.example/producer")}`);
    await expect(page).toHaveURL(/\/producer\/dashboard$/);
  });

  test("verified producer creates, resumes, uploads, submits once, and sees read-only pending state", async ({ page }) => {
    await page.goto("/producer");
    /* The single "Start or resume a submission" CTA was deliberately split in two when the
     * producer application flow landed: newcomers get "Become a producer …" (/producer/apply),
     * returning producers get "Resume a submission" (/producer/submit). This test is about the
     * returning-producer path, so it follows the latter. */
    await page.getByRole("link", { name: "Resume a submission" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("callbackUrl") === "/producer/submit");
    await fixtureSignIn(page);
    await expect(page.getByText("producer-a@example.test")).toBeVisible();
    if ((page.viewportSize()?.width || 0) < 768) await page.getByRole("button", { name: "Toggle producer menu" }).click();
    await expect(page.getByRole("link", { name: "My submissions" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "New submission" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Schedule" })).toHaveCount(0);

    await page.getByRole("link", { name: "New submission" }).first().click();
    await expect(page).toHaveURL(/\/producer\/submit\?id=20000000-/);
    const festivalId = new URL(page.url()).searchParams.get("id");
    expect((await page.request.get(`/api/festivals/${festivalId}`)).status()).toBe(404);

    await page.getByLabel("Festival name").fill("Philly River Arts Weekend");
    await page.getByLabel("Description", { exact: true }).fill("Local artists, music, food, and neighborhood activities along the river.");

    let patchPayload;
    await page.route(`**/api/producer/festivals/${festivalId}`, async (route) => {
      if (route.request().method() === "PATCH") patchPayload = route.request().postDataJSON();
      await route.continue();
    });
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText("Draft saved");
    expect(patchPayload.name).toBe("Philly River Arts Weekend");
    for (const forbidden of ["owner_user_id", "owner", "workflow_state", "status", "drive_file_id", "public_url", "provider"]) {
      expect(patchPayload).not.toHaveProperty(forbidden);
    }
    await page.unroute(`**/api/producer/festivals/${festivalId}`);

    await page.reload();
    await expect(page.getByLabel("Festival name")).toHaveValue("Philly River Arts Weekend");
    await page.goto("/producer/festivals");
    await expect(page.getByRole("heading", { name: "Philly River Arts Weekend" })).toBeVisible();
    await page.getByRole("link", { name: "Resume" }).click();
    await expect(page.getByRole("textbox", { name: "Description", exact: true })).toHaveValue(/Local artists/);

    await page.route(`**/api/producer/festivals/${festivalId}`, (route) => route.abort("failed"), { times: 1 });
    await page.getByLabel("Contact name").fill("Producer Person");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("alert", { name: "Please fix the following" })).toBeVisible();
    await expect(page.getByLabel("Contact name")).toHaveValue("Producer Person");

    await page.getByLabel("Contact email").fill("producer@example.test");
    await page.getByLabel("Contact phone").fill("215-555-0100");
    await page.getByLabel("Website (optional)").fill("https://example.test/festival");
    await page.getByLabel("Venue or street address").fill("101 South Columbus Boulevard");
    await page.getByLabel("City").fill("Philadelphia");
    await page.getByLabel("State").fill("PA");
    await page.getByLabel("ZIP code").fill("19106");
    await page.getByLabel("Start date and time").fill("2026-09-12T10:00");
    await page.getByLabel("End date and time").fill("2026-09-12T18:00");

    await page.getByLabel("Image file").setInputFiles({ name: "not-really.png", mimeType: "image/png", buffer: Buffer.from("not a png") });
    await page.getByLabel("Image description (alt text)").fill("Festival crowd by the river");
    await page.getByText("I have the rights", { exact: false }).click();
    await page.getByRole("button", { name: "Upload private asset" }).click();
    await expect(page.getByText(/truncated, malformed, or outside image dimension limits/i)).toBeVisible();
    await expect(page.getByText(/drive|provider|public url/i)).toHaveCount(0);

    await page.getByLabel("Image file").setInputFiles({ name: "festival.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    await page.getByRole("button", { name: "Upload private asset" }).click();
    await expect(page.getByRole("status")).toContainText("Private asset uploaded successfully");

    await page.getByRole("button", { name: "Review submission" }).click();
    await expect(page.getByRole("heading", { name: "Review submission" })).toBeVisible();
    await page.getByText("I am authorized to represent").click();
    await page.getByText("The information is accurate").click();
    await page.getByText("I agree to the producer submission terms").click();

    let submitCount = 0;
    await page.route(`**/api/producer/festivals/${festivalId}/submit`, async (route) => {
      submitCount += 1;
      await route.continue();
    });
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByRole("heading", { name: "Submission pending review" })).toBeVisible();
    await expect(page.getByText("Pending review", { exact: true }).first()).toBeVisible();
    expect(submitCount).toBe(1);
    await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Upload private asset" })).toBeDisabled();
    await expect(page.locator(`a[href*="${festivalId}"]`).filter({ hasText: /public|view festival/i })).toHaveCount(0);
    expect((await page.request.get(`/api/festivals/${festivalId}`)).status()).toBe(404);
    await expectNoHorizontalOverflow(page);

    const publicPage = await page.context().newPage();
    await publicPage.goto("/?q=Philly+River+Arts+Weekend");
    await expect(publicPage.getByText("Philly River Arts Weekend", { exact: true })).toHaveCount(0);
    await publicPage.close();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Submission pending review" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("mutation capability disables creation and keeps owned drafts truthfully read-only", async ({ page }) => {
    await fixtureSignIn(page);
    const origin = new URL(page.url()).origin;
    const created = await page.request.post("/api/producer/festivals", {
      headers: { origin, "sec-fetch-site": "same-origin" },
      data: { submission_key: "70000000-0000-4000-8000-000000000007" },
    });
    expect(created.ok()).toBe(true);
    const festivalId = (await created.json()).festival.id;

    let createCount = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/producer/festivals") createCount += 1;
    });
    await page.route("**/api/producer/capabilities", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ uploads: { enabled: false }, mutations: { enabled: false } }),
    }));

    await page.goto(`/producer/submit?id=${festivalId}`);
    await expect(page.getByRole("heading", { name: "Festival submission" })).toBeVisible();
    await expect(page.getByText("Draft — changes unavailable", { exact: true })).toBeVisible();
    await expect(page.getByText("This draft is still private", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Festival name")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);

    await page.goto("/producer/submit");
    await expect(page.getByRole("alert", { name: "Please fix the following" }))
      .toContainText("Draft changes are temporarily unavailable");
    expect(createCount).toBe(0);
  });

  test("verified role failures render safe access denied UI", async ({ page }) => {
    await fixtureSignIn(page, "denied");
    await expect(page.getByRole("alert", { name: "Producer access unavailable" })).toContainText("verified producer account is required");
    await expect(page.getByText(/database|role:|email_verified|stack/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});

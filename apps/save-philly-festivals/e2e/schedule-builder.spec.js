import { expect, test } from "@playwright/test";

const detailPath = "/festivals/riverfront-arts-festival";
const storageKey = "savePhillySchedule";

async function buildMixedSchedule(page) {
  await page.goto(detailPath);
  await page.getByRole("button", { name: "Save Riverfront Arts Festival to schedule" }).click();
  await page.getByTestId("program-item").filter({ hasText: "Community Arts Parade" })
    .getByRole("button", { name: "Save Community Arts Parade to schedule" }).click();
  await page.goto("/calendar");
  return page.getByRole("region", { name: "Schedule Builder" });
}

test("builds and persists an accountless mixed schedule", async ({ page }) => {
  await page.goto(detailPath);

  await page.getByRole("button", { name: "Save Riverfront Arts Festival to schedule" }).click();
  await page.getByTestId("program-item").filter({ hasText: "Community Arts Parade" })
    .getByRole("button", { name: "Save Community Arts Parade to schedule" }).click();

  await expect(page.getByRole("button", { name: "Remove Riverfront Arts Festival from schedule" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Community Arts Parade from schedule" })).toBeVisible();

  await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey))
    .toEqual({
      version: 1,
      items: [
        { type: "festival", id: "e2e-approved-1" },
        { type: "event", id: "fixture-program-1" },
      ],
    });

  await page.evaluate((key) => {
    const value = JSON.parse(localStorage.getItem(key));
    value.items.push(value.items[0], value.items[1]);
    localStorage.setItem(key, JSON.stringify(value));
  }, storageKey);
  await page.reload();

  await expect(page.getByRole("button", { name: "Remove Riverfront Arts Festival from schedule" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Community Arts Parade from schedule" })).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).items, storageKey))
    .toHaveLength(2);

  await page.goto("/calendar");
  const builder = page.getByRole("region", { name: "Schedule Builder" });
  await expect(builder.getByText("Your schedule is saved only in this browser on this device")).toBeVisible();
  await expect(builder.getByRole("link", { name: "Riverfront Arts Festival" })).toBeVisible();
  await expect(builder.getByText("Whole festival", { exact: false })).toBeVisible();
  await expect(builder.getByText("Community Arts Parade")).toBeVisible();
  await expect(builder.getByText("Program event", { exact: false })).toBeVisible();

  await builder.getByRole("button", { name: "Remove Community Arts Parade from schedule" }).click();
  await expect(builder.getByText("Community Arts Parade")).toHaveCount(0);
  await expect(builder.getByText("Whole festival", { exact: false })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await builder.getByRole("button", { name: "Clear all" }).click();
  await expect(builder.getByText("No festivals or program events saved yet.")).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey))
    .toEqual({ version: 1, items: [] });
});

test("emails a mixed schedule without marketing consent and keeps it intact", async ({ page }) => {
  const builder = await buildMixedSchedule(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), storageKey);

  await expect(builder.getByRole("checkbox")).toHaveCount(6);
  for (const checkbox of await builder.getByRole("checkbox").all()) await expect(checkbox).not.toBeChecked();
  await builder.getByLabel("Email this schedule").fill("Visitor@Example.com");
  await builder.getByRole("button", { name: "Email schedule" }).click();

  await expect(builder.getByText("Schedule emailed successfully", { exact: false })).toBeVisible();
  await expect(builder.getByText("Community Arts Parade")).toBeVisible();
  await expect(builder.getByText("Whole festival", { exact: false })).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(before);
});

test("records checked organizer consent with preferences separately and preserves schedule", async ({ page }) => {
  const builder = await buildMixedSchedule(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), storageKey);

  await expect(builder.getByText("Riverfront Arts Festival organizers", { exact: false })).toBeVisible();
  await builder.getByLabel(/Riverfront Arts Festival organizers/).check();
  await builder.getByLabel("Reminders").check();
  await builder.getByLabel("Discovery").check();
  await builder.getByLabel("Email this schedule").fill("visitor@example.com");
  const consentButton = builder.getByRole("button", { name: "Request organizer emails" });
  await expect(consentButton).toBeDisabled();
  await builder.getByLabel(/I agree that each organizer I select/).check();
  await consentButton.click();

  await expect(builder.getByText("Organizer request queued for 1 organizer", { exact: false })).toBeVisible();
  await expect(builder.getByText("Community Arts Parade")).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(before);
});

test("reports partial organizer eligibility truthfully without changing schedule", async ({ page }) => {
  const builder = await buildMixedSchedule(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  await page.route("**/api/organizer-consent", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ queued_organizers: 1, ineligible_organizers: 1, replayed: false }),
  }));
  await builder.getByLabel(/Riverfront Arts Festival organizers/).check();
  await builder.getByLabel(/Riverfront Community Partners/).check();
  await builder.getByLabel("Updates").check();
  await builder.getByLabel("Email this schedule").fill("visitor@example.com");
  await builder.getByLabel(/I agree that each organizer I select/).check();
  await builder.getByRole("button", { name: "Request organizer emails" }).click();
  await expect(builder.getByText("1 organizer is no longer eligible", { exact: false })).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(before);
});

test("shows actionable email failure while preserving the mixed schedule", async ({ page }) => {
  const builder = await buildMixedSchedule(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  let submittedBody;

  await page.route("**/api/schedules/email", async (route) => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        status: "failed",
        email_sent: false,
        message: "Email delivery is temporarily unavailable. Please retry.",
      }),
    });
  });

  await builder.getByLabel("Email this schedule").fill("visitor@example.com");
  await builder.getByRole("button", { name: "Email schedule" }).click();

  await expect(builder.getByRole("alert")).toContainText("temporarily unavailable");
  expect(submittedBody).toMatchObject({
    email: "visitor@example.com",
    selection: {
      version: 1,
      items: [
        { type: "festival", id: "e2e-approved-1" },
        { type: "event", id: "fixture-program-1" },
      ],
    },
  });
  expect(submittedBody).not.toHaveProperty("marketing_consent");
  await expect(builder.getByText("Community Arts Parade")).toBeVisible();
  await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(before);
});

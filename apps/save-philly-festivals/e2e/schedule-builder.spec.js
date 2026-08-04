import { expect, test } from "@playwright/test";

const detailPath = "/festivals/riverfront-arts-festival";
const storageKey = "savePhillySchedule";

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

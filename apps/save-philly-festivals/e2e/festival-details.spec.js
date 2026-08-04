import { expect, test } from "@playwright/test";

const approvedSlug = "riverfront-arts-festival";
const unapprovedSlug = "unapproved-neighborhood-festival";

test("navigates from discovery to an approved festival detail", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("region", { name: "Featured festival results" })
    .getByRole("link", { name: "Learn more" })
    .first()
    .click();
  await expect(page).toHaveURL(`/festivals/${approvedSlug}`);
  await expect(page.getByRole("heading", { name: "Riverfront Arts Festival", level: 1 })).toBeVisible();
  await expect(page.getByText("Penn's Landing", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Philadelphia, PA 19106")).toBeVisible();
  await expect(page.getByText("10:00 AM EDT", { exact: false })).toBeVisible();

  const socialSection = page.getByRole("region", { name: "Official social channels" });
  await expect(socialSection.getByRole("link", { name: /Instagram/ })).toBeVisible();
  await expect(socialSection.getByRole("link", { name: /Facebook/ })).toBeVisible();
  await expect(socialSection.getByRole("link", { name: /YouTube/ })).toBeVisible();
  await expect(socialSection.getByRole("link", { name: /Twitter/ })).toHaveCount(0);
  await expect(socialSection.getByRole("link", { name: /TikTok/ })).toHaveCount(0);

  const programItems = page.getByTestId("program-item");
  await expect(programItems).toHaveCount(2);
  await expect(programItems.nth(0)).toContainText("Community Arts Parade");
  await expect(programItems.nth(1)).toContainText("Riverfront Headliner Set");
  await expect(programItems.nth(1)).toContainText("Headliner");
  await expect(page.getByRole("button", { name: "Save Riverfront Arts Festival to schedule" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Save .* to schedule/ })).toHaveCount(3);
});

test("an unavailable or unapproved festival slug returns 404", async ({ page }) => {
  const response = await page.goto(`/festivals/${unapprovedSlug}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

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

  const moderatedFeed = page.getByRole("region", { name: "Festival community posts" });
  await expect(moderatedFeed).toContainText("#RiverfrontArtsFest");
  await expect(moderatedFeed.getByRole("article")).toHaveCount(2);
  await expect(moderatedFeed).toContainText("Artists and neighbors are getting ready for festival weekend.");
  await expect(moderatedFeed).not.toContainText("This hidden post must never be public.");
  await expect(moderatedFeed).not.toContainText("This rejected post must never be public.");
  await expect(moderatedFeed.getByRole("link", { name: "View original post" })).toHaveCount(2);
  const sectionsAreOrdered = await page.evaluate(() => {
    const official = document.querySelector("#official-social-heading")?.closest("section");
    const moderated = document.querySelector("#social-feed-heading")?.closest("section");
    return Boolean(official && moderated && (official.compareDocumentPosition(moderated) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(sectionsAreOrdered).toBe(true);

  const programItems = page.getByTestId("program-item");
  await expect(programItems).toHaveCount(2);
  await expect(programItems.nth(0)).toContainText("Community Arts Parade");
  await expect(programItems.nth(1)).toContainText("Riverfront Headliner Set");
  await expect(programItems.nth(1)).toContainText("Headliner");
  await expect(page.getByRole("button", { name: "Save Riverfront Arts Festival to schedule" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Save .* to schedule/ })).toHaveCount(3);
});

test("provider failure keeps official links and renders a stable social fallback", async ({ page }) => {
  await page.goto("/festivals/south-philly-food-fest");

  await expect(page.getByRole("heading", { name: "South Philly Food Fest", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Official social channels" }).getByRole("link", { name: "Instagram" })).toBeVisible();
  const moderatedFeed = page.getByRole("region", { name: "Festival community posts" });
  await expect(moderatedFeed).toContainText("#SouthPhillyFoodFest");
  await expect(moderatedFeed.getByRole("status")).toContainText("Community posts are temporarily unavailable");
  await expect(moderatedFeed.getByRole("article")).toHaveCount(0);
});

test("an unavailable or unapproved festival slug returns 404", async ({ page }) => {
  const response = await page.goto(`/festivals/${unapprovedSlug}`);

  expect(response?.status()).toBe(404);
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

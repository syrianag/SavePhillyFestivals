import { expect, test } from "@playwright/test";

const secret = process.env.PRODUCER_E2E_SECRET;
const origin = "http://localhost:3100";
const headers = { origin, "sec-fetch-site": "same-origin", "content-type": "application/json" };

async function fixtureLogin(page, as, { preserve = false, callbackUrl } = {}) {
  const query = new URLSearchParams({
    secret,
    as,
    callbackUrl: callbackUrl || (as === "admin" ? "/admin/festivals" : "/producer/dashboard"),
  });
  if (preserve) query.set("preserve", "1");
  await page.goto(`/producer/e2e-login?${query}`);
}

async function createUniqueFestival(page, ordinal) {
  let festival;
  for (let index = 0; index < ordinal; index += 1) {
    const create = await page.request.post("/api/producer/festivals", {
      headers,
      data: { submission_key: crypto.randomUUID() },
    });
    expect(create.status()).toBe(201);
    festival = (await create.json()).festival;
  }
  return festival;
}

function fixtureOrdinal(testInfo, testOffset) {
  return (testInfo.project.name === "mobile-chromium" ? 4 : 1) + testOffset;
}

test.describe("F-09 moderated social feed", () => {
  test("editor configures a feed and approves a cached post", async ({ page }, testInfo) => {
    await fixtureLogin(page, "producer-a");
    const festival = await createUniqueFestival(page, fixtureOrdinal(testInfo, 0));

    await fixtureLogin(page, "admin", { preserve: true, callbackUrl: `/admin/festivals/${festival.id}` });
    await expect(page.getByRole("heading", { name: "Moderated social feed" })).toBeVisible();

    await page.getByLabel("Festival hashtag").fill("FixtureFestival");
    await page.getByLabel("Provider feed ID").fill("fixture-feed-2026");
    await page.getByLabel("Aggregation provider").selectOption("curator");
    await page.getByLabel("Enable approved posts publicly").check();
    await page.getByRole("button", { name: "Save social feed" }).click();
    await expect(page.getByRole("status")).toContainText("Social feed configuration saved");

    const pendingPost = page.getByRole("article").filter({ hasText: "A pending community photo awaiting local editorial review." });
    await expect(pendingPost).toContainText("pending · revision 0");
    await pendingPost.getByRole("button", { name: "Approve post" }).click();
    await expect(page.getByRole("status")).toContainText("Post marked approved");
    await expect(pendingPost).toHaveCount(0);
    await page.getByLabel("Moderation queue").selectOption("approved");
    const approvedPost = page.getByRole("article").filter({ hasText: "A pending community photo awaiting local editorial review." });
    await expect(approvedPost).toContainText("approved · revision 1");
  });

  test("moderator can reach and review posts beyond the first page", async ({ page }, testInfo) => {
    await fixtureLogin(page, "producer-a");
    const festival = await createUniqueFestival(page, fixtureOrdinal(testInfo, 2));
    await fixtureLogin(page, "admin", { preserve: true, callbackUrl: `/admin/festivals/${festival.id}` });

    await page.getByLabel("Festival hashtag").fill("PaginationFixture");
    await page.getByLabel("Provider feed ID").fill("pagination-fixture-feed");
    await page.getByRole("button", { name: "Save social feed" }).click();
    await expect(page.getByRole("navigation", { name: "Social post pages" })).toContainText("Page 1 of 2");
    await page.getByRole("button", { name: "Next posts" }).click();
    await expect(page.getByRole("navigation", { name: "Social post pages" })).toContainText("Page 2 of 2");
    const secondPagePost = page.getByRole("article").filter({ hasText: "Paginated pending fixture 25." });
    await expect(secondPagePost).toBeVisible();
    await secondPagePost.getByRole("button", { name: "Approve post" }).click();
    await expect(page.getByRole("status")).toContainText("Post marked approved");
    await expect(secondPagePost).toHaveCount(0);
    const finalPagePost = page.getByRole("article").filter({ hasText: "Paginated pending fixture 24." });
    await finalPagePost.getByRole("button", { name: "Approve post" }).click();
    await expect(page.getByRole("status")).toContainText("Post marked approved");
    await expect(page.getByRole("navigation", { name: "Social post pages" })).toHaveCount(0);
    await expect(page.getByText("24 posts in this queue", { exact: true })).toBeVisible();
    await expect(page.getByText("Paginated pending fixture 01.", { exact: true })).toBeVisible();
  });

  test("hide and reject require a local moderation reason", async ({ page }, testInfo) => {
    await fixtureLogin(page, "producer-a");
    const festival = await createUniqueFestival(page, fixtureOrdinal(testInfo, 1));
    await fixtureLogin(page, "admin", { preserve: true, callbackUrl: `/admin/festivals/${festival.id}` });

    await page.getByLabel("Festival hashtag").fill("ReasonFixture");
    await page.getByLabel("Provider feed ID").fill("reason-fixture-feed");
    await page.getByRole("button", { name: "Save social feed" }).click();
    const pendingPost = page.getByRole("article").filter({ hasText: "A pending community photo awaiting local editorial review." });
    await pendingPost.getByRole("button", { name: "Hide post" }).click();
    await expect(page.getByText("Enter a moderation reason before hiding or rejecting a post.", { exact: true })).toBeVisible();
    await pendingPost.getByLabel(/Moderation reason/).fill("Contains unrelated promotional content.");
    await pendingPost.getByRole("button", { name: "Hide post" }).click();
    await expect(page.getByRole("status")).toContainText("Post marked hidden");
    await expect(pendingPost).toHaveCount(0);
  });
});

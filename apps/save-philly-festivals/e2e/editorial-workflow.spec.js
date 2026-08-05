import { expect, test } from "@playwright/test";

const secret = process.env.PRODUCER_E2E_SECRET;
const origin = "http://localhost:3100";
const headers = { origin, "sec-fetch-site": "same-origin", "content-type": "application/json" };

async function fixtureLogin(page, as, { preserve = false, callbackUrl } = {}) {
  const query = new URLSearchParams({ secret, as, callbackUrl: callbackUrl || (as === "admin" ? "/admin/festivals" : "/producer/dashboard") });
  if (preserve) query.set("preserve", "1");
  await page.goto(`/producer/e2e-login?${query}`);
}
async function post(request, path, body) {
  return request.post(path, { headers, data: body });
}

test.describe("F-08 editorial workflow", () => {
    test("denies unauthenticated editorial API access", async ({ page }) => {
      const response = await page.request.get("/api/admin/festivals");
      expect(response.status()).toBe(401);
    });

    test("producer feedback/resubmit, reject, approve-private, publish, conflict, republish, and cancellation tombstone", async ({ page }) => {
      const request = page.request;
      await fixtureLogin(page, "producer-a");
      const create = await post(request, "/api/producer/festivals", { submission_key: crypto.randomUUID() });
      expect(create.status()).toBe(201);
      let festival = (await create.json()).festival;
      const patch = await request.patch(`/api/producer/festivals/${festival.id}`, { headers, data: {
        expected_revision: festival.revision,
        name: "notification failure fixture festival",
        description: "A complete fixture description for editorial workflow browser testing.",
        contact_name: "Fixture Producer", contact_email: "producer@example.test", contact_phone: null,
        website_url: "https://example.test/festival", location: "City Hall", city: "Philadelphia", state: "PA", zip_code: "19107",
        calendar_date_type: "timed", time_zone: "America/New_York",
        start_date: "2026-09-12T10:00:00-04:00", end_date: "2026-09-12T18:00:00-04:00", all_day_start: null, all_day_end: null,
      } });
      festival = (await patch.json()).festival;
      let submit = await post(request, `/api/producer/festivals/${festival.id}/submit`, { expected_revision: festival.revision, representation_acknowledged: true, accuracy_acknowledged: true, terms_acknowledged: true, terms_version: 1 });
      expect(submit.status()).toBe(202);
      festival = (await submit.json()).festival;

      await fixtureLogin(page, "admin", { preserve: true, callbackUrl: `/admin/festivals/${festival.id}` });
      await expect(page.getByRole("heading", { name: festival.name })).toBeVisible();
      let response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "changes_requested", reason: "Private reason", producer_message: "Please clarify the accessibility details." });
      expect(response.status()).toBe(200);
      festival = (await response.json()).festival;

      await fixtureLogin(page, "producer-a", { preserve: true, callbackUrl: `/producer/submit?id=${festival.id}` });
      await expect(page.getByText("Please clarify the accessibility details.", { exact: true })).toBeVisible();
      let producerRecord = (await (await request.get(`/api/producer/festivals/${festival.id}`)).json()).festival;
      const producerPatch = await request.patch(`/api/producer/festivals/${festival.id}`, { headers, data: { expected_revision: producerRecord.revision, description: "A complete updated description with clarified accessibility details for visitors." } });
      producerRecord = (await producerPatch.json()).festival;
      submit = await post(request, `/api/producer/festivals/${festival.id}/submit`, { expected_revision: producerRecord.revision, representation_acknowledged: true, accuracy_acknowledged: true, terms_acknowledged: true, terms_version: 1 });
      festival = (await submit.json()).festival;

      await fixtureLogin(page, "admin", { preserve: true });
      response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "rejected", reason: "Private rejection", producer_message: "The submission cannot proceed yet." });
      festival = (await response.json()).festival;
      response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "changes_requested", reason: "Reopen after appeal", producer_message: "You may revise and resubmit." });
      festival = (await response.json()).festival;

      await fixtureLogin(page, "producer-a", { preserve: true });
      producerRecord = (await (await request.get(`/api/producer/festivals/${festival.id}`)).json()).festival;
      const repatch = await request.patch(`/api/producer/festivals/${festival.id}`, { headers, data: { expected_revision: producerRecord.revision, description: "A final complete revised description after editorial appeal and review." } });
      producerRecord = (await repatch.json()).festival;
      submit = await post(request, `/api/producer/festivals/${festival.id}/submit`, { expected_revision: producerRecord.revision, representation_acknowledged: true, accuracy_acknowledged: true, terms_acknowledged: true, terms_version: 1 });
      festival = (await submit.json()).festival;

      await fixtureLogin(page, "admin", { preserve: true });
      response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "approved" });
      festival = (await response.json()).festival;
      expect((await request.get(`/api/festivals/${festival.id}`)).status()).toBe(404);
      response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "published" });
      festival = (await response.json()).festival;
      expect((await request.get(`/api/festivals/${festival.id}`)).status()).toBe(200);

      const publishedRevision = festival.revision;
      response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "unpublished" });
      festival = (await response.json()).festival;
      expect((await request.get(`/api/festivals/${festival.id}`)).status()).toBe(404);
      expect((await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: publishedRevision, to_state: "published" })).status()).toBe(409);
      response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "published" });
      festival = (await response.json()).festival;
      response = await post(request, `/api/admin/festivals/${festival.id}/transitions`, { expected_revision: festival.revision, to_state: "canceled", reason: "Weather safety", public_message: "Canceled due to severe weather." });
      festival = (await response.json()).festival;
      const tombstone = await request.get(`/api/festivals/${festival.id}`);
      expect(tombstone.status()).toBe(200);
      const tombstoneBody = await tombstone.json();
      expect(tombstoneBody).toMatchObject({ canceled: true, public_message: "Canceled due to severe weather." });

      await page.goto(`/festivals/${tombstoneBody.slug}`);
      await expect(page.getByTestId("cancellation-tombstone")).toContainText("Canceled due to severe weather.");
      await expect(page.getByRole("button", { name: /schedule/i })).toHaveCount(0);
      await expect(page.getByText("Program and schedule actions are unavailable because this festival is canceled.")).toBeVisible();
      await expect(page.getByText("Weather safety", { exact: true })).toHaveCount(0);

      await page.goto(`/admin/festivals/${festival.id}`);
      await expect(page.getByText("Notification attempts")).toBeVisible();
      await expect(page.getByText(/provider_error/).first()).toBeVisible();
      await expect(page.getByText("Retry needed", { exact: false }).first()).toBeVisible();
      await page.getByRole("button", { name: "Retry notification" }).first().click();
      await expect(page.getByRole("status")).toContainText("safe to retry");
    });
});

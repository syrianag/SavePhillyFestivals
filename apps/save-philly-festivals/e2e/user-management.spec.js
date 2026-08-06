import { expect, test } from "@playwright/test";

const secret = process.env.PRODUCER_E2E_SECRET;
const origin = "http://localhost:3100";
const headers = { origin, "sec-fetch-site": "same-origin", "content-type": "application/json" };

async function fixtureLogin(page) {
  const query = new URLSearchParams({ secret, as: "admin", callbackUrl: "/admin/settings" });
  await page.goto(`/producer/e2e-login?${query}`);
}

test.describe("secure user management", () => {
  test("requires authentication and enforces origin, password, and privileged-role policy", async ({ page }) => {
    expect((await page.request.get("/api/users")).status()).toBe(401);
    await fixtureLogin(page);

    const crossOrigin = await page.request.post("/api/users", {
      headers: { ...headers, origin: "https://attacker.example" },
      data: { email: "cross-origin@example.test", password: "StrongPass12!", role: "public" },
    });
    expect(crossOrigin.status()).toBe(403);

    const weak = await page.request.post("/api/users", {
      headers,
      data: { email: "weak@example.test", password: "password", role: "public" },
    });
    expect(weak.status()).toBe(400);

    const privileged = await page.request.post("/api/users", {
      headers,
      data: { email: "another-admin@example.test", password: "StrongPass12!", role: "admin" },
    });
    expect(privileged.status()).toBe(403);
  });

  test("creates, deactivates, and reactivates an ordinary account without hard deletion", async ({ page }) => {
    await fixtureLogin(page);
    const email = `managed-${crypto.randomUUID()}@example.test`;
    const createdResponse = await page.request.post("/api/users", {
      headers,
      data: { name: "Managed Producer", email, password: "StrongPass12!", role: "producer" },
    });
    expect(createdResponse.status()).toBe(201);
    const created = (await createdResponse.json()).user;
    expect(created).toMatchObject({ email, role: "producer", status: "active", revision: 0 });
    expect(created.password_hash).toBeUndefined();

    const deactivatedResponse = await page.request.delete(`/api/users/${created.id}`, {
      headers: { origin, "sec-fetch-site": "same-origin" },
    });
    expect(deactivatedResponse.status()).toBe(200);
    expect((await deactivatedResponse.json()).user).toMatchObject({ id: created.id, status: "deactivated", revision: 1 });

    const stillListed = await page.request.get("/api/users?status=deactivated&limit=100");
    expect(stillListed.status()).toBe(200);
    expect((await stillListed.json()).users.some((user) => user.id === created.id)).toBe(true);

    const reactivatedResponse = await page.request.patch(`/api/users/${created.id}`, {
      headers,
      data: { status: "active", reason: "Access restored" },
    });
    expect(reactivatedResponse.status()).toBe(200);
    expect((await reactivatedResponse.json()).user).toMatchObject({ id: created.id, status: "active", revision: 2 });

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });
});

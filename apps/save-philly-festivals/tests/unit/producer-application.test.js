import { describe, expect, it, vi } from "vitest";

import { producerApplicationSchema } from "@/features/producer-access/producer-application-schema";
import { producerApplicationSlug, submitProducerApplication } from "@/features/producer-access/producer-access-service";

const validApplication = {
  name: "Ama Bright",
  email: "Ama@Example.COM",
  password: "a-sufficiently-long-password",
  festival_name: "Odunde Festival",
  representation_acknowledged: true,
  accuracy_acknowledged: true,
  terms_acknowledged: true,
};

describe("producer application schema", () => {
  it("accepts a minimal valid application", () => {
    expect(producerApplicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it("lowercases the email so duplicate detection is case-insensitive", () => {
    const parsed = producerApplicationSchema.parse(validApplication);
    expect(parsed.email).toBe("ama@example.com");
  });

  /* Mirrors `registrationSchema`: length over composition rules, capped where bcrypt truncates. */
  it("rejects a password shorter than 12 characters", () => {
    expect(producerApplicationSchema.safeParse({ ...validApplication, password: "short" }).success).toBe(false);
  });

  /* Each acknowledgement is a representation the applicant makes; an application that silently
   * defaults them would record consent nobody gave. */
  it("requires every acknowledgement to be explicitly true", () => {
    for (const key of ["representation_acknowledged", "accuracy_acknowledged", "terms_acknowledged"]) {
      expect(producerApplicationSchema.safeParse({ ...validApplication, [key]: false }).success).toBe(false);
      const { [key]: _omitted, ...without } = validApplication;
      expect(producerApplicationSchema.safeParse(without).success).toBe(false);
    }
  });

  it("requires a festival name", () => {
    const { festival_name: _omitted, ...without } = validApplication;
    expect(producerApplicationSchema.safeParse(without).success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const parsed = producerApplicationSchema.safeParse({
      ...validApplication,
      festival_start_date: "2026-09-10T00:00:00.000Z",
      festival_end_date: "2026-09-01T00:00:00.000Z",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a non-https festival website", () => {
    expect(producerApplicationSchema.safeParse({ ...validApplication, festival_website_url: "http://example.com" }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(producerApplicationSchema.safeParse({ ...validApplication, role: "admin" }).success).toBe(false);
  });
});

describe("producerApplicationSlug", () => {
  it("slugifies a name and appends the suffix", () => {
    expect(producerApplicationSlug("Odunde Festival", "abcd1234")).toBe("odunde-festival-abcd1234");
  });

  it("strips diacritics and punctuation", () => {
    expect(producerApplicationSlug("Fête de la Musique!", "0000ffff")).toBe("fete-de-la-musique-0000ffff");
  });

  it("falls back to a stable base when the name has no slug characters", () => {
    expect(producerApplicationSlug("!!!", "deadbeef")).toBe("festival-deadbeef");
  });
});

describe("submitProducerApplication", () => {
  function repositoryStub({ existingUser = null } = {}) {
    return {
      findUserByEmail: vi.fn().mockResolvedValue(existingUser),
      createApplication: vi.fn().mockResolvedValue({ user: {}, festival: {}, request: {} }),
    };
  }

  it("creates the account and the request carrying the proposed event", async () => {
    const repository = repositoryStub();
    const parsed = producerApplicationSchema.parse(validApplication);

    const result = await submitProducerApplication(parsed, { repository, randomSuffix: () => "abcd1234" });

    expect(result).toEqual({ submitted: true, created: true });
    expect(repository.createApplication).toHaveBeenCalledTimes(1);
    const payload = repository.createApplication.mock.calls[0][0];
    expect(payload.email).toBe("ama@example.com");
    expect(payload.proposedFestival.name).toBe("Odunde Festival");
    expect(payload.proposedFestival.slug).toBe("odunde-festival-abcd1234");
  });

  /* The proposed event lands in a `Json` column, so a Date would round-trip as a differently
   * shaped value than the approval path expects. */
  it("keeps the proposed festival JSON-serializable", async () => {
    const repository = repositoryStub();
    const parsed = producerApplicationSchema.parse({
      ...validApplication,
      festival_start_date: "2026-09-01T00:00:00.000Z",
    });

    await submitProducerApplication(parsed, { repository, randomSuffix: () => "abcd1234" });

    const { proposedFestival } = repository.createApplication.mock.calls[0][0];
    expect(proposedFestival).toEqual(JSON.parse(JSON.stringify(proposedFestival)));
    expect(typeof proposedFestival.acknowledged_at).toBe("string");
    expect(proposedFestival.start_date).toBe("2026-09-01T00:00:00.000Z");
  });

  /* The password must never reach the repository in the clear. */
  it("hashes the password before it leaves the service", async () => {
    const repository = repositoryStub();
    const parsed = producerApplicationSchema.parse(validApplication);

    await submitProducerApplication(parsed, { repository, randomSuffix: () => "abcd1234" });

    const payload = repository.createApplication.mock.calls[0][0];
    expect(payload.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(payload.passwordHash).not.toContain(validApplication.password);
    expect(payload).not.toHaveProperty("password");
  });

  /* The endpoint is public, so a different response for a known address would turn it into an
   * account-enumeration oracle for a site that also hosts the admin portal. */
  it("reports success without creating anything when the email already exists", async () => {
    const repository = repositoryStub({ existingUser: { id: "u1", email: "ama@example.com" } });
    const parsed = producerApplicationSchema.parse(validApplication);

    const result = await submitProducerApplication(parsed, { repository, randomSuffix: () => "abcd1234" });

    expect(result).toEqual({ submitted: true, created: false });
    expect(repository.createApplication).not.toHaveBeenCalled();
  });

  /* The core invariant: an open endpoint must never hand out submission rights, and must not
   * write a Festival row either — the database only accepts festival inserts whose transition
   * actor is an owning producer or an admin. */
  it("never requests a producer role or a festival row", async () => {
    const repository = repositoryStub();
    const parsed = producerApplicationSchema.parse(validApplication);

    await submitProducerApplication(parsed, { repository, randomSuffix: () => "abcd1234" });

    const payload = repository.createApplication.mock.calls[0][0];
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("festival");
    expect(JSON.stringify(payload)).not.toContain("producer");
  });
});

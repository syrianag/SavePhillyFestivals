import { describe, expect, it, vi } from "vitest";

import {
  renderTemplate,
  renderTemplateHtml,
  tokensUsed,
  unknownTokens,
} from "@/features/producer-access/email-template-service";
import {
  accessDecisionSchema,
  emailTemplateCreateSchema,
  registrationSchema,
} from "@/features/producer-access/producer-access-schema";
import { registerAccount, requestProducerAccess } from "@/features/producer-access/producer-access-service";

describe("registration schema", () => {
  it("normalises the email and enforces a usable password length", () => {
    const parsed = registrationSchema.parse({ name: " Ada ", email: "Ada@Example.COM", password: "correct-horse-battery" });
    expect(parsed.email).toBe("ada@example.com");
    expect(parsed.name).toBe("Ada");
  });

  it("rejects short passwords and caps at bcrypt's 72-byte limit", () => {
    expect(registrationSchema.safeParse({ name: "Ada", email: "a@b.co", password: "short" }).success).toBe(false);
    expect(registrationSchema.safeParse({ name: "Ada", email: "a@b.co", password: "x".repeat(73) }).success).toBe(false);
  });

  it("refuses unknown fields so a role cannot be smuggled in", () => {
    const parsed = registrationSchema.safeParse({
      name: "Ada", email: "a@b.co", password: "correct-horse-battery", role: "admin",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("access decision schema", () => {
  it("requires a reason when declining, because the applicant is shown it", () => {
    expect(accessDecisionSchema.safeParse({ decision: "rejected" }).success).toBe(false);
    expect(accessDecisionSchema.safeParse({ decision: "rejected", reason: "Unverified organization" }).success).toBe(true);
    expect(accessDecisionSchema.safeParse({ decision: "approved" }).success).toBe(true);
  });
});

describe("email templates", () => {
  it("substitutes known tokens and drops unknown ones rather than leaking the placeholder", () => {
    expect(renderTemplate("Hi {{name}}, see {{site_url}}. {{nope}}", { name: "Ada", site_url: "https://x.test" }))
      .toBe("Hi Ada, see https://x.test. ");
  });

  it("treats template values as data, not markup", () => {
    const html = renderTemplateHtml("Hello {{name}}", { name: '<script>alert("x")</script>' });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("reports the tokens a body uses and flags ones the template does not support", () => {
    expect(tokensUsed("{{name}} and {{ reason }}")).toEqual(["name", "reason"]);
    expect(unknownTokens("{{name}} {{typo}}", "producer_access_approved")).toEqual(["typo"]);
  });

  it("requires a machine-safe key when creating a template", () => {
    const base = { name: "X", subject: "S", body: "B" };
    expect(emailTemplateCreateSchema.safeParse({ ...base, key: "producer_access_approved" }).success).toBe(true);
    expect(emailTemplateCreateSchema.safeParse({ ...base, key: "Not A Key" }).success).toBe(false);
  });
});

/* Registration must never reveal which addresses already hold accounts — the same site hosts
 * the admin portal, so an enumeration oracle here is a real disclosure. */
describe("registration behaviour", () => {
  it("reports success without creating anything when the email is taken", async () => {
    const repository = {
      findUserByEmail: vi.fn().mockResolvedValue({ id: "existing", email: "a@b.co" }),
      createPublicAccount: vi.fn(),
    };
    const result = await registerAccount({ name: "Ada", email: "a@b.co", password: "correct-horse-battery" }, { repository });
    expect(result).toEqual({ registered: true, created: false });
    expect(repository.createPublicAccount).not.toHaveBeenCalled();
  });

  it("creates the account with no role taken from input", async () => {
    const repository = {
      findUserByEmail: vi.fn().mockResolvedValue(null),
      createPublicAccount: vi.fn().mockResolvedValue({ id: "new", role: "public" }),
    };
    await registerAccount({ name: "Ada", email: "a@b.co", password: "correct-horse-battery" }, { repository });
    const [args] = repository.createPublicAccount.mock.calls[0];
    expect(args).not.toHaveProperty("role");
    expect(args.passwordHash).not.toBe("correct-horse-battery");
  });
});

describe("producer access requests", () => {
  it("refuses a second open request so the reviewer never sees duplicates", async () => {
    const repository = {
      findOpenRequestForUser: vi.fn().mockResolvedValue({ id: "open" }),
      createRequest: vi.fn(),
    };
    await expect(requestProducerAccess({}, { repository, user: { id: "u1", role: "public" } }))
      .rejects.toMatchObject({ code: "already_pending", statusCode: 409 });
    expect(repository.createRequest).not.toHaveBeenCalled();
  });

  it("refuses a request from an account that already has submission access", async () => {
    const repository = { findOpenRequestForUser: vi.fn(), createRequest: vi.fn() };
    await expect(requestProducerAccess({}, { repository, user: { id: "u1", role: "producer" } }))
      .rejects.toMatchObject({ code: "already_granted" });
    expect(repository.findOpenRequestForUser).not.toHaveBeenCalled();
  });
});

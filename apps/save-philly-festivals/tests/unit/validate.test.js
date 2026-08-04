import { describe, expect, it } from "vitest";
import { z } from "zod";

import { validate } from "@/lib/validate";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contact: z.object({
    email: z.string().email("Email is invalid"),
  }),
});

describe("validate", () => {
  it("returns parsed and transformed data on success", () => {
    expect(
      validate(schema, {
        name: "  Philly Fest  ",
        contact: { email: "organizer@example.com" },
      })
    ).toEqual({
      success: true,
      data: {
        name: "Philly Fest",
        contact: { email: "organizer@example.com" },
      },
    });
  });

  it("maps schema issues to dot-separated field paths", () => {
    const result = validate(schema, {
      name: "",
      contact: { email: "not-an-email" },
    });

    expect(result).toEqual({
      success: false,
      errors: expect.arrayContaining([
        { path: "name", message: "Name is required" },
        { path: "contact.email", message: "Email is invalid" },
      ]),
    });
    expect(result.errors).toHaveLength(2);
  });
});

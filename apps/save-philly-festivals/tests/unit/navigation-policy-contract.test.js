import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DEFAULT_NAVIGATION_LINKS } from "@/features/navigation/navigation-defaults";
import { navigationE2ERepository } from "@/features/navigation/navigation-e2e-fixture";
import { createNavigationLinkSchema, isPrivateHref, updateNavigationLinkSchema } from "@/features/navigation/navigation-schema";
import { toPublicNavigation } from "@/features/navigation/navigation-service";

/**
 * Enforces the link visibility policy:
 *
 *   Public links   render only in the public navigation.
 *   Private links  (`/admin*`, `/producer/*`) render only in that portal's own navigation.
 *   Exception      "Discover Festivals" (`/`) is global, so the admin portal always has a way
 *                  back to the public site.
 *
 * This used to parse the hardcoded arrays out of `NavBar.jsx` as source text. Navigation is now
 * admin-editable at runtime, so source text can no longer see what will actually render — the
 * rule moved to the schema (on write) and the service (on read), and so did these assertions.
 * The admin navigation is still a static array, so it is still checked as text.
 */

const projectRoot = resolve(import.meta.dirname, "../..");
const adminNav = readFileSync(resolve(projectRoot, "src/components/admin/AdminNav.jsx"), "utf8");

const validLink = { placement: "header", label: "About", href: "/about" };

describe("private routes cannot enter public navigation", () => {
  it.each([
    "/admin",
    "/admin/festivals",
    "/admin/settings",
    "/producer/dashboard",
    "/producer/submit",
  ])("rejects %s on create", (href) => {
    expect(createNavigationLinkSchema.safeParse({ ...validLink, href }).success).toBe(false);
  });

  it.each(["/admin", "/admin/festivals", "/producer/dashboard"])("rejects %s on update", (href) => {
    expect(updateNavigationLinkSchema.safeParse({ href }).success).toBe(false);
  });

  /* One character separates the public marketing page from the private portal. */
  it("still allows the public For Producers marketing page", () => {
    expect(isPrivateHref("/producer")).toBe(false);
    expect(isPrivateHref("/producer/dashboard")).toBe(true);
    expect(createNavigationLinkSchema.safeParse({ ...validLink, href: "/producer" }).success).toBe(true);
  });

  /* Guards against a prefix match treating an unrelated route as private. */
  it("does not mistake a lookalike public route for a private one", () => {
    expect(isPrivateHref("/administrators")).toBe(false);
    expect(isPrivateHref("/producers-guide")).toBe(false);
  });

  /**
   * Belt and braces. The schema blocks these on write, but a row could predate a rule change or
   * arrive through a direct database edit, and a leaked /admin link in the public menu is the
   * exact failure this feature must not introduce.
   */
  it("filters a private link out at render time even if one reaches storage", () => {
    const { header } = toPublicNavigation([
      { placement: "header", label: "About", href: "/about", visible: true },
      { placement: "header", label: "Sneaky", href: "/admin/settings", visible: true },
    ]);
    expect(header.map((link) => link.href)).toEqual(["/about"]);
  });

  it("omits hidden links from the public menu", () => {
    const { header } = toPublicNavigation([
      { placement: "header", label: "Shown", href: "/about", visible: true },
      { placement: "header", label: "Hidden", href: "/tours", visible: false },
    ]);
    expect(header.map((link) => link.label)).toEqual(["Shown"]);
  });
});

describe("shipped defaults", () => {
  it("contain no private route", () => {
    const leaked = DEFAULT_NAVIGATION_LINKS.filter((link) => isPrivateHref(link.href));
    expect(leaked, `Defaults must not seed private routes: ${leaked.map((l) => l.href).join(", ")}`).toEqual([]);
  });

  it("every default passes its own schema", () => {
    for (const link of DEFAULT_NAVIGATION_LINKS) {
      expect(createNavigationLinkSchema.safeParse(link).success, `${link.placement} ${link.href}`).toBe(true);
    }
  });

  /* Navigation renders on every public page. An empty table or a failed query must degrade to
   * the shipped menu, never to nothing. */
  it("are what an empty database renders", () => {
    const { header, footer } = toPublicNavigation([]);
    expect(header.length).toBeGreaterThan(0);
    expect(footer.length).toBeGreaterThan(0);
    expect(header.map((link) => link.href)).toContain("/");
  });
});

/**
 * The E2E fixture swaps the public menu for a canned one on an environment flag, so it has the
 * same shape as an authentication bypass: harmless in CI, unacceptable if it can ever be switched
 * on against production. `user-e2e-fixture.js` is guarded the same way.
 */
describe("navigation E2E fixture fails closed", () => {
  it("is inert unless its flag is exactly \"1\"", () => {
    for (const value of [undefined, "", "0", "true", "yes"]) {
      expect(navigationE2ERepository(value), `flag ${JSON.stringify(value)}`).toBeNull();
    }
    expect(navigationE2ERepository("1")).not.toBeNull();
  });

  it("refuses to activate in production even with the flag set", () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      expect(navigationE2ERepository("1")).toBeNull();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  /* The fixture must render the same menu the real defaults produce, or E2E would be asserting
   * against navigation no user ever sees. */
  it("renders the shipped menu", async () => {
    const fixture = navigationE2ERepository("1");
    const { header, footer } = toPublicNavigation(await fixture.listVisible());
    expect(header).toEqual(toPublicNavigation([]).header);
    expect(footer).toEqual(toPublicNavigation([]).footer);
  });
});

describe("admin navigation", () => {
  function linkArray(source, name) {
    const start = source.indexOf(`const ${name} = [`);
    expect(start, `${name} not found`).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("];", start));
    return [...body.matchAll(/href: "([^"]+)", label: "([^"]+)"/g)].map(([, href, label]) => ({ href, label }));
  }

  it("admits only /admin routes", () => {
    const foreign = linkArray(adminNav, "navLinks").filter((link) => !link.href.startsWith("/admin"));
    expect(foreign, `Admin navigation may only list /admin routes: ${foreign.map((l) => l.href).join(", ")}`).toEqual([]);
  });

  /* Without this an editor has no way out of the admin portal — the bug that prompted the policy. */
  it("keeps Discover Festivals as the way back to the public site", () => {
    expect(adminNav).toMatch(/href="\/"[\s\S]{0,300}Discover Festivals/);
  });

  it("keeps Producer Access and Sponsors out of the admin navigation", () => {
    const hrefs = linkArray(adminNav, "navLinks").map((link) => link.href);
    expect(hrefs).not.toContain("/admin/producer-requests");
    expect(hrefs).not.toContain("/admin/sponsors");
  });
});

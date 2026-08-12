import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Enforces the link visibility policy that the navigation kept drifting away from.
 *
 *   Public links   render only in the public NavBar.
 *   Private links  (`/admin/*`, `/producer/*`) render only in that portal's own navigation.
 *   Exception      "Discover Festivals" (`/`) is global and may appear anywhere, so the admin
 *                  portal always has a way back to the public site.
 *
 * Asserted against source text because these are static arrays, and the failure they guard
 * against — a private route quietly appended to the public list — is invisible until someone
 * signs in with the right role and looks.
 */

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(projectRoot, path), "utf8");

const navBar = read("src/components/shared/NavBar.jsx");
const adminNav = read("src/components/admin/AdminNav.jsx");

/** Entries of a `const <name> = [ { href, label } ]` array literal. */
function linkArray(source, name) {
  const start = source.indexOf(`const ${name} = [`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf("];", start));
  return [...body.matchAll(/href:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)]
    .map(([, href, label]) => ({ href, label }));
}

const PRIVATE = (href) => href.startsWith("/admin") || href.startsWith("/producer/");

describe("navigation link visibility policy", () => {
  it("keeps every private route out of the public navigation", () => {
    const leaked = linkArray(navBar, "publicLinks").filter((link) => PRIVATE(link.href));

    expect(leaked, `Private routes must not appear in publicLinks: ${leaked.map((l) => l.href).join(", ")}`).toEqual([]);
  });

  /* `/producer` is the public marketing page and must stay reachable; `/producer/dashboard` is
   * the portal and must not. The distinction is one character, so it gets its own assertion. */
  it("still allows the public For Producers marketing page", () => {
    const hrefs = linkArray(navBar, "publicLinks").map((link) => link.href);
    expect(hrefs).toContain("/producer");
    expect(hrefs).not.toContain("/producer/dashboard");
  });

  it("routes each role to its portal through the session controls, not the public links", () => {
    /* The portal link is defined in its own map so it cannot be mistaken for a public link. */
    expect(navBar).toMatch(/const PORTAL_BY_ROLE = \{/);
    for (const role of ["admin", "super_admin", "producer"]) {
      expect(navBar).toContain(`${role}:`);
    }
  });

  it("admits only /admin routes to the admin navigation", () => {
    const foreign = linkArray(adminNav, "navLinks").filter((link) => !link.href.startsWith("/admin"));

    expect(foreign, `Admin navigation may only list /admin routes: ${foreign.map((l) => l.href).join(", ")}`).toEqual([]);
  });

  /* The one global exception. Without it an editor has no way out of the admin portal, which is
   * the bug that prompted the policy. */
  it("keeps Discover Festivals as the admin portal's way back to the public site", () => {
    expect(adminNav).toMatch(/href="\/"[\s\S]{0,200}Discover Festivals/);
  });

  /* Removed on request; both broke when opened from the admin view. Re-adding either is a
   * decision, not an accident, so it should have to update this test. */
  it("keeps Producer Access and Sponsors out of the admin navigation", () => {
    const hrefs = linkArray(adminNav, "navLinks").map((link) => link.href);
    expect(hrefs).not.toContain("/admin/producer-requests");
    expect(hrefs).not.toContain("/admin/sponsors");
  });

  /* `admin/layout.jsx` renders AdminNav instead of NavBar, so any pathname branch here for
   * `/admin` is unreachable code that reads like live configuration. */
  it("does not reintroduce an unreachable admin branch in the public NavBar", () => {
    expect(navBar).not.toMatch(/pathname\.startsWith\("\/admin"\)/);
    expect(navBar).not.toMatch(/const staffLinks/);
  });
});

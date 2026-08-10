import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import {
  SPONSOR_SLOTS,
  SPONSOR_TILE,
  getSponsorsForSlot,
  isDemoMode,
} from "@/features/sponsors/sponsor-placements";

const aboutPage = fileURLToPath(
  new URL("../../src/app/(public)/about/page.js", import.meta.url)
);

afterEach(() => {
  delete process.env.SPONSOR_DEMO;
});

describe("sponsor placements", () => {
  /* Rails were reintroduced alongside the footer. They render only at 2xl and above; below
   * that the footer band carries the rail sponsors too, so a rail advertiser is relocated on
   * small screens rather than dropped. */
  it("exposes both rails and the footer as placements", () => {
    expect(Object.values(SPONSOR_SLOTS)).toEqual(["left_rail", "right_rail", "footer"]);
  });

  it("shows the real sponsors with no flag set, so the footer band is never empty by accident", () => {
    delete process.env.SPONSOR_DEMO;

    const names = getSponsorsForSlot(SPONSOR_SLOTS.FOOTER).map((s) => s.name);
    expect(names).toEqual([
      "Alston-Beech Foundation",
      "Philadelphia Activities Fund",
      "PECO Powering the Arts",
    ]);
    expect(isDemoMode()).toBe(false);
  });

  it("keeps the sponsor list out of the about page it moved off", () => {
    const source = readFileSync(aboutPage, "utf8");
    expect(source).not.toContain("Alston-Beech");
    expect(source).not.toContain("Our Sponsors");
  });

  it("renders real sponsors as pills, since none of them supplied artwork", () => {
    for (const sponsor of getSponsorsForSlot(SPONSOR_SLOTS.FOOTER)) {
      expect(sponsor.imageUrl).toBeUndefined();
      expect(sponsor.pillColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(sponsor.textColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("returns nothing for an unknown slot name", () => {
    expect(getSponsorsForSlot("left_rail")).toEqual([]);
    expect(getSponsorsForSlot(undefined)).toEqual([]);
  });

  it("appends demo tiles after the real sponsors when SPONSOR_DEMO=1", () => {
    const real = getSponsorsForSlot(SPONSOR_SLOTS.FOOTER);
    process.env.SPONSOR_DEMO = "1";
    const withDemo = getSponsorsForSlot(SPONSOR_SLOTS.FOOTER);

    expect(withDemo.length).toBeGreaterThan(real.length);
    expect(withDemo.slice(0, real.length).map((s) => s.name)).toEqual(real.map((s) => s.name));

    for (const sponsor of withDemo.slice(real.length)) {
      expect(sponsor.name).toMatch(/\(demo\)$/);
      expect(sponsor.imageUrl).toMatch(/^\/sponsors\/demo\//);
      expect(sponsor.alt).toBeTruthy();
      expect(sponsor.width).toBe(SPONSOR_TILE.width);
      expect(sponsor.height).toBe(SPONSOR_TILE.height);
    }
  });

  it("treats any value other than exactly \"1\" as demo mode off", () => {
    const real = getSponsorsForSlot(SPONSOR_SLOTS.FOOTER).length;

    for (const value of ["0", "true", "yes", ""]) {
      process.env.SPONSOR_DEMO = value;
      expect(isDemoMode()).toBe(false);
      expect(getSponsorsForSlot(SPONSOR_SLOTS.FOOTER)).toHaveLength(real);
    }
  });

  it("ships every demo creative it points at, authored at the tile size", () => {
    process.env.SPONSOR_DEMO = "1";

    const demo = getSponsorsForSlot(SPONSOR_SLOTS.FOOTER).filter((s) => s.imageUrl);
    expect(demo.length).toBeGreaterThan(0);

    for (const sponsor of demo) {
      const path = fileURLToPath(new URL(`../../public${sponsor.imageUrl}`, import.meta.url));
      expect(existsSync(path), `missing creative: ${sponsor.imageUrl}`).toBe(true);

      const svg = readFileSync(path, "utf8");
      expect(svg, `${sponsor.imageUrl} is not authored at the tile size`).toContain(
        `width="${SPONSOR_TILE.width}" height="${SPONSOR_TILE.height}"`
      );
      /* The demo badge is what stops a screenshot of this page being mistaken for a
       * page with real paying advertisers on it. */
      expect(svg, `${sponsor.imageUrl} is missing its DEMO AD badge`).toContain("DEMO AD");
    }
  });
});

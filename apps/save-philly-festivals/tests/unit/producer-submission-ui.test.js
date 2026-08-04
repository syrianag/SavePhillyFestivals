import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { producerE2EFixtureEnabled, signProducerE2ECookie, verifyProducerE2ECookie } from "@/features/producer-submission/producer-e2e-fixture";
import { isoToNewYorkLocal, newYorkLocalToIso } from "@/features/producer-submission/producer-dates";

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(projectRoot, path), "utf8");

describe("producer UI date contracts", () => {
  it("converts browser local values to explicit New York offsets across DST", () => {
    expect(newYorkLocalToIso("2026-08-04T12:30")).toBe("2026-08-04T12:30:00-04:00");
    expect(newYorkLocalToIso("2026-12-04T12:30")).toBe("2026-12-04T12:30:00-05:00");
    expect(isoToNewYorkLocal("2026-08-04T16:30:00.000Z")).toBe("2026-08-04T12:30");
  });

  it("rejects nonexistent spring-forward and ambiguous fallback wall times", () => {
    expect(() => newYorkLocalToIso("2027-03-14T02:30")).toThrow(/does not exist/);
    expect(() => newYorkLocalToIso("2026-11-01T01:30")).toThrow(/ambiguous/);
  });
});

describe("producer fixture and authorization static contracts", () => {
  it("requires exact flag, non-production mode, and a per-run secret", () => {
    const secret = "x".repeat(32);
    expect(producerE2EFixtureEnabled("1", "test", secret)).toBe(true);
    expect(producerE2EFixtureEnabled("1", "production", secret)).toBe(false);
    expect(producerE2EFixtureEnabled("1", "test", "short")).toBe(false);
    for (const value of [undefined, "", "0", "true", "01", " 1", "1 "]) expect(producerE2EFixtureEnabled(value, "test", secret)).toBe(false);
  });

  it("signs fixture cookies and rejects tampering or another run secret", () => {
    const secret = "a".repeat(32);
    const cookie = signProducerE2ECookie("producer-a", secret);
    expect(verifyProducerE2ECookie(cookie, secret)).toBe("producer-a");
    expect(verifyProducerE2ECookie(cookie.replace("producer-a", "denied"), secret)).toBeNull();
    expect(verifyProducerE2ECookie(cookie, "b".repeat(32))).toBeNull();
  });

  it("keeps the production server authorization boundary and same-origin callback redirect", () => {
    const layout = read("src/app/producer/layout.jsx");
    const authorization = read("src/features/producer-submission/producer-page-authorization.js");
    const proxy = read("src/proxy.js");
    expect(layout).not.toContain('"use client"');
    expect(layout).toContain("authorizeProducerPage");
    expect(layout).toContain("/login?callbackUrl=");
    expect(authorization).toContain("authorizeProducer(dependencies)");
    expect(authorization).toContain("productionDependencies()");
    expect(proxy).toContain('process.env.PRODUCER_E2E_FIXTURE === "1"');
    expect(proxy).toContain('process.env.NODE_ENV !== "production"');
    expect(proxy).toContain("PRODUCER_E2E_SECRET");
    expect(proxy).toContain('pathname === "/producer"');
    expect(proxy).toContain('pathname.startsWith("/producer/")');
  });

  it("injects the fixture before production auth, database, or provider imports", () => {
    const http = read("src/features/producer-submission/producer-submission-http.js");
    const fixtureCheck = http.indexOf("producerE2EFixtureEnabled()");
    expect(fixtureCheck).toBeGreaterThan(-1);
    expect(fixtureCheck).toBeLessThan(http.indexOf('import("@/lib/auth")'));
    expect(fixtureCheck).toBeLessThan(http.indexOf('import("./producer-submission-repository")'));
    expect(fixtureCheck).toBeLessThan(http.indexOf('import("@/lib/google-drive")'));
  });
});

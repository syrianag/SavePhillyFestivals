import { describe, expect, it, vi } from "vitest";

import {
  authorizeGeocodeSweep,
  geocodeFestival,
  runGeocodeSweep,
} from "@/features/festivals/geocoding-service";

const bearer = (token) => ({ headers: { get: (name) => (name === "authorization" ? `Bearer ${token}` : null) } });

function stubRepository(candidates = []) {
  return {
    findGeocodeCandidates: vi.fn().mockResolvedValue(candidates),
    countGeocodeCandidates: vi.fn().mockResolvedValue(0),
    recordGeocodeAttempt: vi.fn().mockResolvedValue({}),
  };
}

const ok = (lat, lon) => vi.fn().mockResolvedValue({
  ok: true, status: 200,
  json: async () => [{ lat: String(lat), lon: String(lon), addresstype: "road" }],
});

describe("authorizeGeocodeSweep", () => {
  /* The sweep writes coordinates and spends a rate-limited third-party quota, so an open
   * endpoint would let anyone corrupt pins and get the app throttled by Nominatim. */
  it("accepts only an exact bearer match", () => {
    expect(authorizeGeocodeSweep(bearer("correct-secret"), "correct-secret")).toBe(true);
    expect(authorizeGeocodeSweep(bearer("wrong-secret"), "correct-secret")).toBe(false);
    expect(authorizeGeocodeSweep(bearer("correct-secret"), undefined)).toBe(false);
    expect(authorizeGeocodeSweep({ headers: { get: () => null } }, "correct-secret")).toBe(false);
  });

  it("rejects a token that merely starts with the secret", () => {
    expect(authorizeGeocodeSweep(bearer("correct-secret-and-more"), "correct-secret")).toBe(false);
  });
});

describe("geocodeFestival", () => {
  const festival = { id: "f1", location: "Penn's Landing", city: "Philadelphia", state: "PA" };

  it("records coordinates and the location that produced them", async () => {
    const repository = stubRepository();
    const result = await geocodeFestival(festival, { repository, fetchImpl: ok(39.95, -75.14), throttle: false });

    expect(result).toMatchObject({ ok: true, latitude: 39.95, longitude: -75.14 });
    const [, patch] = repository.recordGeocodeAttempt.mock.calls[0];
    /* geocoded_location is the staleness signal: without it, an edited location would never be
     * recognised as needing a re-geocode. */
    expect(patch).toMatchObject({ geocode_status: "resolved", geocoded_location: "Penn's Landing" });
  });

  it("spends no request on a location that names no place", async () => {
    const repository = stubRepository();
    const fetchImpl = vi.fn();
    const result = await geocodeFestival(
      { id: "f2", location: "Various Locations", city: "Philadelphia", state: "PA" },
      { repository, fetchImpl, throttle: false }
    );

    expect(result).toMatchObject({ ok: false, reason: "unmappable_location" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(repository.recordGeocodeAttempt).toHaveBeenCalledOnce();
  });

  it("retries once without the venue segment when the full address does not match", async () => {
    const repository = stubRepository();
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ lat: "39.98", lon: "-75.18", addresstype: "road" }] });

    const result = await geocodeFestival(
      { id: "f3", location: "Smith Memorial Playground, 3500 Reservoir Dr, Philadelphia, PA", city: "Philadelphia", state: "PA" },
      { repository, fetchImpl, throttle: false }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, latitude: 39.98 });
  });

  it("records the reason rather than throwing when the provider fails", async () => {
    const repository = stubRepository();
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await geocodeFestival(festival, { repository, fetchImpl, throttle: false });

    expect(result).toMatchObject({ ok: false, reason: "request_failed" });
    expect(repository.recordGeocodeAttempt).toHaveBeenCalledOnce();
  });

  /* A background write must never touch revision or workflow_state: those are what fire the
   * audit trigger, which would then demand a transition row that no sweep can supply. */
  it("writes no workflow columns", async () => {
    const repository = stubRepository();
    await geocodeFestival(festival, { repository, fetchImpl: ok(39.95, -75.14), throttle: false });
    const [, patch] = repository.recordGeocodeAttempt.mock.calls[0];
    expect(patch).not.toHaveProperty("revision");
    expect(patch).not.toHaveProperty("workflow_state");
  });
});

describe("runGeocodeSweep", () => {
  it("reports resolved, failed, and what remains", async () => {
    const repository = stubRepository([
      { id: "a", location: "Penn's Landing", city: "Philadelphia", state: "PA" },
      { id: "b", location: "Various Locations", city: "Philadelphia", state: "PA" },
    ]);
    repository.countGeocodeCandidates.mockResolvedValue(7);

    const outcome = await runGeocodeSweep({ repository, batchSize: 2, fetchImpl: ok(39.95, -75.14) });

    expect(outcome).toMatchObject({ considered: 2, resolved: 1, failed: 1, remaining: 7 });
    expect(outcome.reasons).toMatchObject({ unmappable_location: 1 });
  });

  it("does nothing when nothing is due", async () => {
    const repository = stubRepository([]);
    const fetchImpl = vi.fn();
    const outcome = await runGeocodeSweep({ repository, fetchImpl });
    expect(outcome).toMatchObject({ considered: 0, resolved: 0, failed: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

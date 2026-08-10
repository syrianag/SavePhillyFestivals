import { describe, expect, it } from "vitest";

import {
  buildFallbackQuery,
  buildGeocodeQuery,
  classifyGeocodeResult,
  DELAWARE_VALLEY_BOUNDS,
  isPlottableCoordinate,
  isUnmappableLocation,
  isWithinRegion,
} from "@/features/festivals/geocoding";

const PHILADELPHIA = { city: "Philadelphia", state: "PA" };

describe("buildGeocodeQuery", () => {
  /* The defect this replaces: the old builder appended city/state unconditionally. `city` is
   * never null — the baseline migration defaults it to 'Philadelphia' — so a complete address
   * became "…, Philadelphia, PA 19130, United States, Philadelphia, PA, USA" and never matched. */
  it("does not append city or state to an address that already carries them", () => {
    expect(buildGeocodeQuery({ location: "2201 Fairmount Ave, Philadelphia, PA 19130, United States", ...PHILADELPHIA }))
      .toBe("2201 Fairmount Ave, Philadelphia, PA 19130, United States");
    expect(buildGeocodeQuery({ location: "Two Locals Brewing 3701 Market St, Philadelphia, PA 19104", ...PHILADELPHIA }))
      .toBe("Two Locals Brewing 3701 Market St, Philadelphia, PA 19104, USA");
  });

  it("leaves an out-of-town address alone instead of pinning it to Philadelphia", () => {
    expect(buildGeocodeQuery({ location: "Boardwalk, Atlantic City, NJ", ...PHILADELPHIA }))
      .toBe("Boardwalk, Atlantic City, NJ, USA");
    expect(buildGeocodeQuery({ location: "Delaware Art Museum, 2301 Kentmere Parkway, Wilmington, DE 19806", ...PHILADELPHIA }))
      .toBe("Delaware Art Museum, 2301 Kentmere Parkway, Wilmington, DE 19806, USA");
  });

  it("recognises a ZIP code as evidence the address is already placed", () => {
    expect(buildGeocodeQuery({ location: "1500 Market St 19102", ...PHILADELPHIA })).toBe("1500 Market St 19102, USA");
  });

  it("appends city and state to a bare venue name", () => {
    expect(buildGeocodeQuery({ location: "Penn's Landing", ...PHILADELPHIA }))
      .toBe("Penn's Landing, Philadelphia, PA, USA");
  });

  it("does not mistake lowercase English words for state codes", () => {
    /* "in" is Indiana's code and "or" is Oregon's. Matching case-insensitively would treat this
     * as an already-placed address and skip the city entirely. */
    expect(buildGeocodeQuery({ location: "The park in the square", ...PHILADELPHIA }))
      .toBe("The park in the square, Philadelphia, PA, USA");
  });

  it("strips leading 'at', trailing notes, and normalises separators", () => {
    expect(buildGeocodeQuery({ location: "at  Clark Park   (rain date June 3)", ...PHILADELPHIA }))
      .toBe("Clark Park, Philadelphia, PA, USA");
    expect(buildGeocodeQuery({ location: "Dickinson St; 1904 E Passyunk Ave, Philadelphia, PA 19148", ...PHILADELPHIA }))
      .toBe("Dickinson St, 1904 E Passyunk Ave, Philadelphia, PA 19148, USA");
  });

  /* Each of these would otherwise spend 1.1 seconds of throttle to guarantee a no_match. */
  it("returns null for locations that name no resolvable place", () => {
    for (const location of ["Various Locations", "Citywide", "TBD", "To be announced", "Online", "Virtual", "N/A", "  "]) {
      expect(buildGeocodeQuery({ location, ...PHILADELPHIA }), location).toBeNull();
    }
    expect(isUnmappableLocation("Various Locations")).toBe(true);
    expect(isUnmappableLocation("Clark Park")).toBe(false);
  });
});

describe("buildFallbackQuery", () => {
  it("drops the leading venue segment, where Nominatim is weakest", () => {
    expect(buildFallbackQuery({ location: "Smith Memorial Playground, 3500 Reservoir Dr, Philadelphia, PA", ...PHILADELPHIA }))
      .toBe("3500 Reservoir Dr, Philadelphia, PA, USA");
  });

  it("returns null when there is nothing left to drop, so no request is wasted", () => {
    expect(buildFallbackQuery({ location: "Penn's Landing", ...PHILADELPHIA })).toBeNull();
  });
});

describe("classifyGeocodeResult", () => {
  const accept = (lat, lon, extra = {}) => classifyGeocodeResult({ lat: String(lat), lon: String(lon), addresstype: "road", ...extra });

  it("accepts the regional cities the city-only bounding box used to reject", () => {
    const regional = [
      ["Doylestown PA", 40.31, -75.13],
      ["Wilmington DE", 39.75, -75.55],
      ["Bryn Mawr PA", 40.02, -75.32],
      ["Schwenksville PA", 40.26, -75.46],
      ["Atlantic City NJ", 39.36, -74.42],
    ];
    for (const [label, lat, lon] of regional) {
      expect(accept(lat, lon), label).toMatchObject({ ok: true, latitude: lat, longitude: lon });
    }
  });

  it("still rejects the other Philadelphias", () => {
    expect(accept(33.5, -90.1).reason).toBe("outside_region"); // Philadelphia, Mississippi
    expect(accept(44.15, -75.71).reason).toBe("outside_region"); // Philadelphia, New York
    expect(accept(35.45, -84.4).reason).toBe("outside_region"); // Philadelphia, Tennessee
  });

  /* Nominatim returns a state centroid when it cannot find the address. That lands inside the
   * region box and would otherwise be accepted as a pin in a field near Harrisburg. */
  it("rejects a whole-state or whole-country match even when it falls inside the region", () => {
    expect(accept(40.0, -75.5, { addresstype: "state" }).reason).toBe("imprecise_match");
    expect(accept(40.0, -75.5, { addresstype: "country" }).reason).toBe("imprecise_match");
  });

  it("rejects unparseable and null-island coordinates", () => {
    expect(classifyGeocodeResult({ lat: "not-a-number", lon: "-75.1" }).reason).toBe("invalid_coordinates");
    expect(accept(0, 0).reason).toBe("invalid_coordinates");
    expect(classifyGeocodeResult(null).reason).toBe("no_match");
  });
});

describe("coordinate guards", () => {
  it("treats out-of-range and null-island coordinates as unplottable", () => {
    expect(isPlottableCoordinate(39.95, -75.16)).toBe(true);
    expect(isPlottableCoordinate(0, 0)).toBe(false);
    expect(isPlottableCoordinate(91, -75)).toBe(false);
    expect(isPlottableCoordinate(Number.NaN, -75)).toBe(false);
  });

  it("bounds the Delaware Valley, not just the city", () => {
    expect(isWithinRegion(39.9526, -75.1652)).toBe(true); // City Hall
    expect(isWithinRegion(DELAWARE_VALLEY_BOUNDS.minLat, DELAWARE_VALLEY_BOUNDS.minLon)).toBe(true);
    expect(isWithinRegion(41.5, -75.0)).toBe(false); // Scranton — too far north
  });
});

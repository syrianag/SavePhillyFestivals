"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { isPlottableCoordinate, isWithinRegion } from "@/features/festivals/geocoding";

/* Philadelphia City Hall — a stable center when pins are sparse or absent. */
const PHILADELPHIA_CENTER = Object.freeze([39.9526, -75.1652]);
const DEFAULT_ZOOM = 12;
/* Framing bounds. `maxZoom` stops a single pin filling the screen at street level; `minZoom`
 * stops the map ever showing the whole eastern seaboard. */
const FIT_MAX_ZOOM = 15;
const MIN_ZOOM = 8;

/* Leaflet's default marker resolves marker-icon.png / marker-shadow.png as relative URLs
 * from its stylesheet. Under a bundler those paths do not exist, so every pin renders as a
 * broken image while the DOM still looks correct. An inline SVG marker sidesteps the whole
 * problem: no image requests, nothing for the CSP to block, and it scales cleanly. */
const MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">
  <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26c0-7.7-6.3-14-14-14z" fill="#1E7BF6"/>
  <circle cx="14" cy="14" r="5.5" fill="#fff"/>
</svg>`;

/* Three buckets rather than a continuous scale: the point is "a few / some / a lot" at a
 * glance, and more gradations just look like noise at map scale. */
function clusterSizeClass(count) {
  if (count < 10) return "festival-cluster--small";
  if (count < 50) return "festival-cluster--medium";
  return "festival-cluster--large";
}

/**
 * Leaflet map of published festivals.
 *
 * Provider note: this uses Leaflet with OpenStreetMap raster tiles rather than the Google
 * Maps or ArcGIS JavaScript SDKs. That is a CSP decision, not a preference. `next.config.mjs`
 * sets `script-src 'self' 'unsafe-inline'` with no external origins, so a third-party map SDK
 * loaded from a CDN is blocked outright — the most likely reason an earlier map attempt
 * rendered as an unusable grey box. Leaflet ships through npm and is bundled, so it is
 * served from 'self'; its tiles are plain HTTPS images, already permitted by
 * `img-src 'self' blob: data: https:`. The result needs no CSP change at all.
 *
 * Leaflet mutates a real DOM node and is initialised in an effect rather than through
 * react-leaflet's component tree, which keeps the integration to one file and avoids
 * double-initialisation under React 19 strict mode.
 *
 * The map instance and the markers are managed by two separate effects. Creating the map is
 * expensive and must happen once; markers change whenever the pin set does. Rebuilding both
 * together — as a single `[pins]` effect did — tears down and recreates the map on every prop
 * change, which flashes the tiles and resets the user's pan and zoom.
 */
export function FestivalMap({ pins = [], focusedId = null }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markerLayerRef = useRef(null);
  const markersByIdRef = useRef(new Map());
  /* Held in a ref so the marker-sync callback does not take the router as a dependency and
   * rebuild every marker whenever the router identity changes. Assigned in an effect, not
   * during render — a ref write during render is not a safe read for anything else. */
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  /* The map is created asynchronously, so the marker effect cannot simply run on mount — it
   * would find null refs and no-op, then never retry. This flips once the map exists. */
  const [mapReady, setMapReady] = useState(false);

  const syncMarkers = useCallback(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!leaflet || !map || !layer) return;

    layer.clearLayers();
    markersByIdRef.current = new Map();

    const icon = leaflet.divIcon({
      html: MARKER_SVG,
      className: "festival-map-pin",
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -36],
    });

    /* A pin with a corrupt coordinate is dropped rather than plotted. Leaflet will happily
     * render NaN or (0, 0) and then produce bounds that make the whole map useless. */
    const plottable = pins.filter((pin) => isPlottableCoordinate(pin.latitude, pin.longitude));

    const markers = [];
    for (const pin of plottable) {
      const marker = leaflet
        .marker([pin.latitude, pin.longitude], { title: pin.name, alt: pin.name, icon })
        .addTo(layer);

      /* A click navigates straight to the festival, client-side. The popup this replaces
       * existed only to hold a link, and that link was raw HTML injected into Leaflet — a
       * plain <a>, so it forced a full page reload. Leaflet's default `keyboard: true` gives
       * each marker tabIndex and fires `click` on Enter, so keyboard users get the same
       * single-step transition. */
      const href = `/festivals/${encodeURIComponent(pin.slug)}`;
      marker.bindTooltip(pin.location ? `${pin.name} — ${pin.location}` : pin.name, { direction: "top", offset: [0, -36] });
      marker.on("click", () => routerRef.current.push(href));
      marker.on("mouseover", () => routerRef.current.prefetch(href));
      markersByIdRef.current.set(pin.id, marker);
      markers.push({ marker, pin });
    }

    /* Frame on in-region pins only. One festival mis-geocoded to another state would otherwise
     * stretch the bounds across the country and collapse every Philadelphia pin into a dot —
     * the out-of-region pin is still drawn, it just does not get a vote on the initial view. */
    const framing = markers.filter(({ pin }) => isWithinRegion(pin.latitude, pin.longitude));
    const framingMarkers = (framing.length ? framing : markers).map(({ marker }) => marker);

    if (framingMarkers.length > 1) {
      map.fitBounds(leaflet.featureGroup(framingMarkers).getBounds().pad(0.15), {
        maxZoom: FIT_MAX_ZOOM,
        padding: [24, 24],
      });
    } else if (framingMarkers.length === 1) {
      map.setView(framingMarkers[0].getLatLng(), DEFAULT_ZOOM);
    }
  }, [pins]);

  // Mount-only: create the map, tile layer, and resize observer exactly once.
  useEffect(() => {
    let cancelled = false;
    let resizeObserver;

    async function initialise() {
      const leaflet = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      /* Clustering is loaded here rather than at module scope so it lands in the same async
       * chunk as Leaflet itself and adds nothing to the route's initial JS. */
      await import("leaflet.markercluster");
      await import("leaflet.markercluster/dist/MarkerCluster.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = leaflet.map(containerRef.current, {
        center: PHILADELPHIA_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        /* Deliberately off: wheel-zoom over a full-width map hijacks page scrolling. */
        scrollWheelZoom: false,
      });
      leafletRef.current = leaflet;
      mapRef.current = map;

      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);

      /* Philadelphia festivals concentrate in Center City. Without clustering, the pins at a
       * fit-all zoom overlap into a mass where the ones underneath cannot be clicked at all.
       * `spiderfyOnMaxZoom` is the part that matters most here: several festivals geocode to
       * the exact same venue centroid, and only spiderfy separates identical coordinates. */
      markerLayerRef.current = leaflet.markerClusterGroup({
        maxClusterRadius: 60,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 17,
        chunkedLoading: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return leaflet.divIcon({
            html: `<span>${count}</span>`,
            className: `festival-cluster ${clusterSizeClass(count)}`,
            iconSize: [40, 40],
          });
        },
      }).addTo(map);

      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
      setMapReady(true);
    }

    initialise();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Marker sync: once the map exists, and again whenever the pin set changes.
  useEffect(() => {
    if (!mapReady) return;
    syncMarkers();
  }, [mapReady, syncMarkers]);

  /* "Show on map" from the list. `zoomToShowLayer` expands whichever cluster contains the
   * marker before revealing it — without it, focusing a clustered pin would pan to a cluster
   * bubble and appear to do nothing. */
  useEffect(() => {
    if (!mapReady || !focusedId) return;
    const marker = markersByIdRef.current.get(focusedId);
    const layer = markerLayerRef.current;
    if (!marker || !layer) return;
    if (typeof layer.zoomToShowLayer === "function") {
      layer.zoomToShowLayer(marker, () => marker.openTooltip());
    } else {
      mapRef.current?.setView(marker.getLatLng(), 16);
      marker.openTooltip();
    }
  }, [focusedId, mapReady]);

  if (pins.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-2xs">
        <p className="font-heading text-lg font-bold text-slate-900">No mapped festivals yet</p>
        <p className="mt-2 max-w-md font-body text-sm text-slate-600">
          Festivals appear here once their location has been resolved to map coordinates. Published
          festivals without coordinates are still listed on the{" "}
          <Link href="/" className="font-semibold text-brand-teal underline">
            discovery page
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={`Map of ${pins.length} Philadelphia festival${pins.length === 1 ? "" : "s"}`}
      className="min-h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200/60 shadow-2xs"
    />
  );
}

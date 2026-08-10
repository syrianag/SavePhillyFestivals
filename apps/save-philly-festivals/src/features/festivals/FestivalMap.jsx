"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/* Philadelphia City Hall — a stable center when pins are sparse or absent. */
const PHILADELPHIA_CENTER = Object.freeze([39.9526, -75.1652]);
const DEFAULT_ZOOM = 12;

/* Leaflet's default marker resolves marker-icon.png / marker-shadow.png as relative URLs
 * from its stylesheet. Under a bundler those paths do not exist, so every pin renders as a
 * broken image while the DOM still looks correct. An inline SVG marker sidesteps the whole
 * problem: no image requests, nothing for the CSP to block, and it scales cleanly. */
const MARKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">
  <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26c0-7.7-6.3-14-14-14z" fill="#1E7BF6"/>
  <circle cx="14" cy="14" r="5.5" fill="#fff"/>
</svg>`;

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
 */
export function FestivalMap({ pins = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver;

    async function initialise() {
      const leaflet = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = leaflet.map(containerRef.current, {
        center: PHILADELPHIA_CENTER,
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
        .addTo(map);

      const icon = leaflet.divIcon({
        html: MARKER_SVG,
        className: "festival-map-pin",
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -36],
      });

      const markers = [];
      for (const pin of pins) {
        const marker = leaflet
          .marker([pin.latitude, pin.longitude], { title: pin.name, icon })
          .addTo(map);
        const name = escapeHtml(pin.name);
        const location = pin.location ? `<p style="margin:4px 0 8px">${escapeHtml(pin.location)}</p>` : "";
        const image = pin.image_url
          ? `<img src="${escapeHtml(pin.image_url)}" alt="" loading="lazy" style="display:block;width:180px;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px" />`
          : "";
        marker.bindPopup(
          `${image}<strong>${name}</strong>${location}<a href="/festivals/${encodeURIComponent(pin.slug)}">View festival</a>`
        );
        markers.push(marker);
      }

      /* Frame the actual pins so the map is useful even when festivals cluster outside
       * center city, but never zoom past the default on a single pin. */
      if (markers.length > 1) {
        map.fitBounds(leaflet.featureGroup(markers).getBounds().pad(0.15));
      } else if (markers.length === 1) {
        map.setView([pins[0].latitude, pins[0].longitude], DEFAULT_ZOOM);
      }

      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
    }

    initialise();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [pins]);

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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

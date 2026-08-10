"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

const REASON_COPY = {
  unmappable_location: "The location text does not name a place a map can resolve.",
  no_match: "The mapping service could not find this address.",
  outside_region: "The address resolved outside the greater Philadelphia region.",
  imprecise_match: "The address only resolved to a whole state, which is too coarse to plot.",
  rate_limited: "The mapping service is rate limiting us. Try again shortly.",
  request_failed: "The mapping service could not be reached.",
};

/**
 * Warns that a festival has no map coordinates, and offers to resolve them.
 *
 * Placed beside the publish action because that is the moment coverage matters: a festival
 * published without coordinates is simply absent from the map, silently. The scheduled sweep
 * will pick it up eventually, but an editor about to publish should not have to wait or guess.
 *
 * This is the one place a third-party geocoding call happens inside a request — acceptable
 * because it is admin-triggered, singular, and its failure changes nothing.
 */
export function FestivalGeocodeNotice({ festival }) {
  const router = useRouter();
  const [status, setStatus] = useState({ pending: false, message: "", error: "" });

  if (festival.latitude != null && festival.longitude != null) return null;

  async function geocodeNow() {
    setStatus({ pending: true, message: "", error: "" });
    try {
      const response = await fetch(`/api/admin/festivals/${encodeURIComponent(festival.id)}/geocode`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ pending: false, message: "", error: body?.error || "Geocoding failed." });
        return;
      }
      if (body.resolved) {
        setStatus({ pending: false, message: "Coordinates found. This festival will appear on the map.", error: "" });
        router.refresh();
        return;
      }
      setStatus({
        pending: false,
        message: "",
        error: REASON_COPY[body.reason] || "The location could not be resolved.",
      });
    } catch {
      setStatus({ pending: false, message: "", error: "Geocoding failed." });
    }
  }

  const priorReason = festival.geocode_failure_reason ? REASON_COPY[festival.geocode_failure_reason] : null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-center gap-2 font-body text-sm font-semibold text-amber-900">
        <MapPin className="size-4" aria-hidden="true" />
        No map coordinates
      </p>
      <p className="mt-1 text-sm text-amber-800">
        {priorReason || "This festival has not been resolved to a location yet, so it will not appear on the map."}
      </p>
      {status.message && <p className="mt-2 text-sm text-emerald-700">{status.message}</p>}
      {status.error && <p role="alert" className="mt-2 text-sm text-red-700">{status.error}</p>}
      <Button type="button" variant="outline" size="sm" className="mt-3" disabled={status.pending} onClick={geocodeNow}>
        {status.pending ? "Looking up…" : "Geocode now"}
      </Button>
    </div>
  );
}

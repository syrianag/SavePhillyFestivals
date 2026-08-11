"use client";

import { useState } from "react";
import { MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useLocationLookup } from "./useLocationLookup";

/**
 * Address-confirm affordance shared by the producer submission form and the admin festival
 * editor. Only ever proposes a replacement for the `location` text field — it never writes
 * coordinates itself, so the existing geocode sweep / on-demand button stays the only writer of
 * `latitude`/`longitude` (see ISSUE.log, "Geocoding fallback can't help venue-only locations with
 * no comma"). Saving the confirmed text is still the caller's normal save/patch flow.
 */
export default function LocationLookupPanel({ endpoint, location, city, state, onConfirm }) {
  const { status, candidates, message, search, reset } = useLocationLookup(endpoint);
  const [selected, setSelected] = useState(null);

  function handleSearch() {
    setSelected(null);
    search({ location, city, state });
  }

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    reset();
    setSelected(null);
  }

  function handleDismiss() {
    reset();
    setSelected(null);
  }

  return (
    <div className="mt-2 rounded-lg border border-dashed border-slate-200 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-slate-500">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          Not sure this address will map correctly?
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSearch}
          disabled={status === "loading" || !location?.trim()}
        >
          <Search className="size-3.5" aria-hidden="true" />
          {status === "loading" ? "Searching…" : "Find address"}
        </Button>
      </div>

      {message && <p className="mt-2 text-slate-500">{message}</p>}

      {candidates.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {candidates.map((candidate, index) => (
            <label
              key={`${candidate.label}-${index}`}
              className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-2 hover:bg-slate-50 has-[:checked]:border-slate-400 has-[:checked]:bg-slate-50"
            >
              <input
                type="radio"
                name="location-candidate"
                className="mt-0.5"
                checked={selected?.label === candidate.label}
                onChange={() => setSelected(candidate)}
              />
              <span>{candidate.label}</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleDismiss}>
              Dismiss
            </Button>
            <Button type="button" size="sm" disabled={!selected} onClick={handleConfirm}>
              Use this address
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

/**
 * Client-side state for the address-confirm flow. Talks to whichever lookup endpoint the caller
 * is authorized for (producer or admin) — see `location-lookup-schema.js` for the shared request
 * shape both sides accept.
 */
export function useLocationLookup(endpoint) {
  const [state, setState] = useState({ status: "idle", candidates: [], message: "" });

  async function search({ location, city, state: stateCode }) {
    const trimmed = location?.trim();
    if (!trimmed) return;
    setState({ status: "loading", candidates: [], message: "" });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location: trimmed,
          ...(city?.trim() ? { city: city.trim() } : {}),
          ...(stateCode?.trim() ? { state: stateCode.trim() } : {}),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setState({ status: "error", candidates: [], message: body?.error || "Address lookup failed." });
        return;
      }
      const candidates = body.candidates || [];
      setState({
        status: "done",
        candidates,
        message: candidates.length ? "" : "No confident match found for that address.",
      });
    } catch {
      setState({ status: "error", candidates: [], message: "Address lookup failed." });
    }
  }

  function reset() {
    setState({ status: "idle", candidates: [], message: "" });
  }

  return { ...state, search, reset };
}

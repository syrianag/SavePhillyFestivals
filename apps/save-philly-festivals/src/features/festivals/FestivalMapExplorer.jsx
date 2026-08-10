"use client";

import { useState } from "react";
import Link from "next/link";

import { FestivalMap } from "@/features/festivals/FestivalMap";
import { FestivalMapList } from "@/features/festivals/FestivalMapList";

/**
 * Map plus companion list.
 *
 * Owns the focus link between the two so neither component has to know about the other. The
 * sidebar collapses below the grid on narrow screens rather than sitting beside a squeezed map.
 */
export function FestivalMapExplorer({ pins, hasFilters, clearHref }) {
  const [focusedId, setFocusedId] = useState(null);

  /* Two different empty states. "No festivals match these filters" is recoverable and should
   * offer a way out; "nothing is geocoded yet" is a data problem the visitor cannot fix, and
   * FestivalMap renders that one itself. */
  if (pins.length === 0 && hasFilters) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-white p-8 text-center shadow-2xs">
        <p className="font-heading text-lg font-bold text-slate-900">No festivals match these filters</p>
        <p className="mt-2 max-w-md font-body text-sm text-slate-600">
          Try a different keyword, date range, or category — or clear the filters to see every
          mapped festival.
        </p>
        <Link
          href={clearHref}
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-6 font-ui text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-slate-800"
        >
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <FestivalMap pins={pins} focusedId={focusedId} />
      </div>
      <FestivalMapList pins={pins} onFocus={setFocusedId} focusedId={focusedId} />
    </div>
  );
}

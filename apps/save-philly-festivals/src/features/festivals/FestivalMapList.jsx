"use client";

import { Crosshair } from "lucide-react";
import Link from "next/link";

import { formatFestivalDate } from "@/features/festivals/discovery";

/**
 * The list beside the map.
 *
 * Exists because a map alone is not browsable: pins carry no dates, no categories, and nothing
 * scannable. Each row links to the festival and can pull the map to its pin, which is the one
 * direction of sync worth having — map-to-list scrolling was cut, since a marker click already
 * means "open this festival" and a click that means two things is worse than no sync at all.
 */
export function FestivalMapList({ pins, onFocus, focusedId }) {
  if (pins.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="font-ui text-sm font-bold text-slate-500">
        {pins.length} mapped {pins.length === 1 ? "festival" : "festivals"}
      </p>
      <ul className="flex max-h-[560px] flex-col gap-2 overflow-y-auto pr-1">
        {pins.map((pin) => (
          <li key={pin.id}>
            <div
              className={`rounded-xl border p-3 transition-colors ${
                focusedId === pin.id
                  ? "border-indigo-500 bg-indigo-50/60"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <Link
                href={`/festivals/${pin.slug}`}
                className="font-heading text-sm font-bold text-slate-900 hover:text-indigo-600"
              >
                {pin.name}
              </Link>
              {pin.location && (
                <p className="mt-1 font-body text-xs text-slate-500">{pin.location}</p>
              )}
              <p className="mt-1 font-body text-xs text-slate-400">
                {formatFestivalDate(pin.start_date, pin.end_date)}
              </p>
              <button
                type="button"
                onClick={() => onFocus(pin.id)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 font-ui text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                <Crosshair className="size-3" aria-hidden="true" />
                Show on map
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

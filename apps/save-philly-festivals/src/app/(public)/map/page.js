import { Suspense } from "react";
import Link from "next/link";

import { DiscoveryControls } from "@/components/shared/DiscoveryControls";
import { discoveryQueryString, parseDiscoveryParams } from "@/features/festivals/discovery";
import { FestivalMapExplorer } from "@/features/festivals/FestivalMapExplorer";
import { getPublicFestivalMapPins } from "@/features/festivals/festival-queries";
import { getDiscoveryFacets } from "@/features/festivals/public-discovery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Festival map - Save Philly Festivals",
  description: "Browse Philadelphia festivals by location on an interactive map.",
};

function MapSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-hidden="true">
      <div className="min-h-[520px] w-full animate-pulse rounded-2xl border border-slate-200/60 bg-slate-100" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
        ))}
      </div>
    </div>
  );
}

async function MapResults({ filters, clearHref }) {
  const pins = await getPublicFestivalMapPins(filters);
  const hasFilters = Boolean(filters.q || filters.category || filters.location || filters.date || filters.start || filters.end);
  return <FestivalMapExplorer pins={pins} hasFilters={hasFilters} clearHref={clearHref} />;
}

export default async function MapPage({ searchParams }) {
  const filters = parseDiscoveryParams(await searchParams);
  const query = discoveryQueryString(filters);
  /* Facets come from what is published, not from the current filters, so they are fetched
   * outside the Suspense boundary and stay stable while the pins reload. */
  const facets = await getDiscoveryFacets().catch(() => ({ categories: [], locations: [] }));

  /* Carry the active filters across the tabs, so switching views does not silently reset what
   * the visitor was looking at. */
  const tabHref = (path) => (query ? `${path}?${query}` : path);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 md:px-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900 md:text-4xl">Festival map</h1>
        <p className="mt-2 max-w-2xl font-body text-slate-600">
          Every published festival with a mapped location. Select a pin to open that festival.
        </p>
      </div>

      <DiscoveryControls
        filters={filters}
        categories={facets.categories}
        locations={facets.locations}
        action="/map"
        clearHref="/map"
      />

      <nav aria-label="Discovery views" className="flex items-center gap-4 border-b border-slate-200 pb-3">
        <Link href={tabHref("/")} className="pb-2.5 font-ui text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 md:text-base">
          Featured
        </Link>
        <span aria-current="page" className="border-b-2 border-slate-900 pb-2.5 font-ui text-sm font-bold text-slate-900 md:text-base">
          Map
        </span>
        <Link href={tabHref("/calendar")} className="pb-2.5 font-ui text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 md:text-base">
          Calendar
        </Link>
      </nav>

      {/* Only the pins reload when filters change; the heading, controls, and tabs stay put. */}
      <Suspense key={query} fallback={<MapSkeleton />}>
        <MapResults filters={filters} clearHref="/map" />
      </Suspense>
    </div>
  );
}

import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

const controlClass = "h-[33px] rounded-[16.5px] border border-[#AEAEAE] bg-transparent px-[13px] font-ui text-sm font-medium text-[#606060] focus:outline-none focus:ring-2 focus:ring-black/40";

export function DiscoveryControls({ filters, categories, locations }) {
  return (
    <form action="/" method="get" role="search" aria-label="Festival discovery" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-text-gray" />
          <label htmlFor="festival-search" className="sr-only">Search festivals</label>
          <input
            id="festival-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search festivals..."
            className="w-full rounded-full border border-border bg-[#EEEDED] py-2.5 pl-10 pr-4 font-body text-sm text-foreground placeholder:text-brand-text-gray focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <button type="submit" className="flex size-10 items-center justify-center rounded-full border border-border bg-[#EEEDED] text-foreground transition-colors hover:bg-muted" aria-label="Apply festival search and filters">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="date-filter" className="sr-only">Date</label>
        <select id="date-filter" name="date" defaultValue={filters.date} className={controlClass}>
          <option value="">Any date</option>
          <option value="this-week">Next 7 days</option>
          <option value="this-month">This month</option>
          <option value="next-month">Next month</option>
          <option value="custom">Custom range</option>
        </select>

        <label htmlFor="start-date" className="sr-only">Start date</label>
        <input id="start-date" name="start" type="date" defaultValue={filters.start} aria-label="Start date" className={controlClass} />
        <span aria-hidden="true" className="font-body text-sm text-[#848484]">to</span>
        <label htmlFor="end-date" className="sr-only">End date</label>
        <input id="end-date" name="end" type="date" defaultValue={filters.end} aria-label="End date" className={controlClass} />

        <label htmlFor="category-filter" className="sr-only">Category</label>
        <select id="category-filter" name="category" defaultValue={filters.category} className={controlClass}>
          <option value="">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>

        <label htmlFor="location-filter" className="sr-only">Neighborhood or location</label>
        <input id="location-filter" name="location" list="festival-locations" defaultValue={filters.location} placeholder="Neighborhood or location" className={`${controlClass} min-w-44`} />
        <datalist id="festival-locations">
          {locations.map((location) => <option key={location} value={location} />)}
        </datalist>

        <label htmlFor="sort-filter" className="sr-only">Sort results</label>
        <select id="sort-filter" name="sort" defaultValue={filters.sort} className={controlClass}>
          {filters.q && <option value="relevance">Relevance</option>}
          <option value="soonest">Soonest</option>
          <option value="newest">Newest</option>
          <option value="name">Name</option>
        </select>

        <button type="submit" className="flex h-[33px] items-center justify-center rounded-[16.5px] bg-[#424242] px-[17px] font-ui text-sm font-medium text-white">Apply</button>
        <Link href="/" className="px-2 font-ui text-sm font-medium text-[#606060] underline decoration-1 underline-offset-4">Clear</Link>
      </div>
    </form>
  );
}

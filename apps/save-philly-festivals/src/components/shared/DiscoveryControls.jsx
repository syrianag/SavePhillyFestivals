import Link from "next/link";
import { Search, SlidersHorizontal, Calendar as CalendarIcon, MapPin, Tag, ListFilter } from "lucide-react";

const controlClass = "h-[38px] rounded-full border border-slate-200 bg-white px-4 font-ui text-sm font-semibold text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";

export function DiscoveryControls({ filters, categories, locations }) {
  return (
    <form action="/" method="get" role="search" aria-label="Festival discovery" className="flex flex-col gap-4">
      {/* Search Input and Submit */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 group">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4.5 top-1/2 size-4.5 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          <label htmlFor="festival-search" className="sr-only">Search festivals</label>
          <input
            id="festival-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search festivals by name, category, city..."
            className="w-full h-[48px] rounded-full border border-slate-200 bg-white/95 pl-11.5 pr-4 font-body text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <button 
          type="submit" 
          className="flex size-[48px] items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
          aria-label="Apply festival search and filters"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4.5" />
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap items-center gap-2.5 bg-slate-50/60 backdrop-blur-xs p-3 rounded-2xl border border-slate-200/50">
        <div className="flex items-center gap-1.5">
          <label htmlFor="date-filter" className="sr-only">Date</label>
          <select id="date-filter" name="date" defaultValue={filters.date} className={controlClass}>
            <option value="">Any date</option>
            <option value="this-week">Next 7 days</option>
            <option value="this-month">This month</option>
            <option value="next-month">Next month</option>
            <option value="custom">Custom range</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="start-date" className="sr-only">Start date</label>
          <input id="start-date" name="start" type="date" defaultValue={filters.start} aria-label="Start date" className={controlClass} />
          <span aria-hidden="true" className="font-body text-xs font-semibold text-slate-400">to</span>
          <label htmlFor="end-date" className="sr-only">End date</label>
          <input id="end-date" name="end" type="date" defaultValue={filters.end} aria-label="End date" className={controlClass} />
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="category-filter" className="sr-only">Category</label>
          <select id="category-filter" name="category" defaultValue={filters.category} className={controlClass}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="location-filter" className="sr-only">Neighborhood or location</label>
          <input 
            id="location-filter" 
            name="location" 
            list="festival-locations" 
            defaultValue={filters.location} 
            placeholder="Location..." 
            className={`${controlClass} min-w-44`} 
          />
          <datalist id="festival-locations">
            {locations.map((location) => <option key={location} value={location} />)}
          </datalist>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="sort-filter" className="sr-only">Sort results</label>
          <select id="sort-filter" name="sort" defaultValue={filters.sort} className={controlClass}>
            {filters.q && <option value="relevance">Relevance</option>}
            <option value="soonest">Soonest</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button 
            type="submit" 
            className="flex h-[38px] items-center justify-center rounded-full bg-slate-900 px-5 font-ui text-sm font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
          >
            Apply
          </button>
          <Link 
            href="/" 
            className="h-[38px] flex items-center justify-center px-4 font-ui text-sm font-semibold text-slate-500 hover:text-slate-950 transition-colors"
          >
            Clear
          </Link>
        </div>
      </div>
    </form>
  );
}

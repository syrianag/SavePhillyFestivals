"use client";

import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export function SearchBar({ className, onSearch, onFilter, filters, onFilterChange, ...props }) {
  const [query, setQuery] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSearch?.(query);
  }

  function handleSelect(key, value) {
    onFilterChange?.({ ...filters, [key]: value });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search festivals"
            placeholder="Search festivals..."
            className="w-full rounded-full border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 font-body text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={onFilter}
          className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50/50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 shadow-2xs hover:shadow-xs"
          aria-label="Open festival filters"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <div className="flex h-[36px] items-center gap-1 rounded-full border border-slate-200 bg-white px-[14px] py-[6px] shadow-2xs transition-colors hover:border-slate-300">
          <select
            aria-label="Filter festivals by date"
            value={filters?.date || ""}
            onChange={(e) => handleSelect("date", e.target.value)}
            className="bg-transparent font-ui text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
          >
            <option value="">Date</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="next-month">Next Month</option>
          </select>
        </div>
        <div className="flex h-[36px] items-center gap-1 rounded-full border border-slate-200 bg-white px-[14px] py-[6px] shadow-2xs transition-colors hover:border-slate-300">
          <select
            aria-label="Filter festivals by type"
            value={filters?.type || ""}
            onChange={(e) => handleSelect("type", e.target.value)}
            className="bg-transparent font-ui text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
          >
            <option value="">Type</option>
            <option value="Music">Music</option>
            <option value="Food">Food</option>
            <option value="Art">Art</option>
            <option value="Cultural">Cultural</option>
            <option value="Community">Community</option>
            <option value="Holidays">Holidays</option>
          </select>
        </div>
        <div className="flex h-[36px] items-center gap-1 rounded-full border border-slate-200 bg-white px-[14px] py-[6px] shadow-2xs transition-colors hover:border-slate-300">
          <select
            aria-label="Filter festivals by area"
            value={filters?.area || ""}
            onChange={(e) => handleSelect("area", e.target.value)}
            className="bg-transparent font-ui text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
          >
            <option value="">Area</option>
            <option value="West Philadelphia">West Philadelphia</option>
            <option value="Kensington">Kensington</option>
            <option value="Center City">Center City</option>
            <option value="South Philly">South Philly</option>
            <option value="North Philly">North Philly</option>
          </select>
        </div>
      </div>
    </form>
  );
}

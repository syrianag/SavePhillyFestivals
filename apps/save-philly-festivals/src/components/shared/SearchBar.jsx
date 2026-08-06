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
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-text-gray" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search festivals"
            placeholder="Search festivals..."
            className="w-full rounded-full border border-border bg-[#EEEDED] py-2.5 pl-10 pr-4 font-body text-sm text-foreground placeholder:text-brand-text-gray focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <button
          type="button"
          onClick={onFilter}
          className="flex size-10 items-center justify-center rounded-full border border-border bg-[#EEEDED] text-foreground transition-colors hover:bg-muted"
          aria-label="Open festival filters"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex h-[33px] items-center gap-2 rounded-[16.5px] border border-[#AEAEAE] bg-transparent px-[13px] py-[6px]">
          <select
            aria-label="Filter festivals by date"
            value={filters?.date || ""}
            onChange={(e) => handleSelect("date", e.target.value)}
            className="bg-transparent font-ui text-base font-medium text-[#848484] focus:outline-none"
            style={{ letterSpacing: "-0.198857px", lineHeight: "19px" }}
          >
            <option value="">Date</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="next-month">Next Month</option>
          </select>
        </div>
        <div className="flex h-[33px] items-center gap-2 rounded-[16.5px] border border-[#AEAEAE] bg-transparent px-[13px] py-[6px]">
          <select
            aria-label="Filter festivals by type"
            value={filters?.type || ""}
            onChange={(e) => handleSelect("type", e.target.value)}
            className="bg-transparent font-ui text-base font-medium text-[#848484] focus:outline-none"
            style={{ letterSpacing: "-0.198857px", lineHeight: "19px" }}
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
        <div className="flex h-[33px] items-center gap-2 rounded-[16.5px] border border-[#AEAEAE] bg-transparent px-[13px] py-[6px]">
          <select
            aria-label="Filter festivals by area"
            value={filters?.area || ""}
            onChange={(e) => handleSelect("area", e.target.value)}
            className="bg-transparent font-ui text-base font-medium text-[#848484] focus:outline-none"
            style={{ letterSpacing: "-0.198857px", lineHeight: "19px" }}
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

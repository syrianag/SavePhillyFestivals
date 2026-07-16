"use client";

import { cn } from "@/lib/utils";
import { Calendar, Search, SlidersHorizontal } from "lucide-react";
import React, { useState } from "react";

export function SearchBar({ className, onSearch, onFilter, ...props }) {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = React.useState([]);

  React.useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch?.(query);
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
            placeholder="Search festivals..."
            className="w-full rounded-full border border-border bg-[#EEEDED] py-2.5 pl-10 pr-4 font-body text-sm text-foreground placeholder:text-brand-text-gray focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <button
          type="button"
          onClick={onFilter}
          className="flex size-10 items-center justify-center rounded-full border border-border bg-[#EEEDED] text-foreground transition-colors hover:bg-muted"
          aria-label="Filter"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex h-[33px] items-center gap-2 rounded-[16.5px] border border-[#AEAEAE] bg-transparent px-[13px] py-[6px]">
          <select
            className="bg-transparent font-ui text-base font-medium text-[#848484] focus:outline-none"
            style={{ letterSpacing: "-0.198857px", lineHeight: "19px" }}
          >
            <option>Date</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Next Month</option>
          </select>
        </div>
        <div className="flex h-[33px] items-center gap-2 rounded-[16.5px] border border-[#AEAEAE] bg-transparent px-[13px] py-[6px]">
          <select
            className="bg-transparent font-ui text-base font-medium text-[#848484] focus:outline-none"
            style={{ letterSpacing: "-0.198857px", lineHeight: "19px" }}
          >
            <option>Type</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex h-[33px] items-center gap-2 rounded-[16.5px] border border-[#AEAEAE] bg-transparent px-[13px] py-[6px]">
          <select
            className="bg-transparent font-ui text-base font-medium text-[#848484] focus:outline-none"
            style={{ letterSpacing: "-0.198857px", lineHeight: "19px" }}
          >
            <option>Area</option>
            <option>West Philadelphia</option>
            <option>Kensington</option>
            <option>Center City</option>
            <option>South Philly</option>
            <option>North Philly</option>
          </select>
        </div>
      </div>
    </form>
  );
}

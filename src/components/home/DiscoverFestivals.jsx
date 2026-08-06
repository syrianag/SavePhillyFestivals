"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SearchBar } from "@/components/shared/SearchBar";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { MapSection } from "@/components/shared/MapSection";
import { CalendarSection } from "@/components/shared/CalendarSection";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";
import { filterFestivals } from "@/lib/festival-filters";

const views = [
  { id: "grid", label: "Grid" },
  { id: "map", label: "Map" },
  { id: "calendar", label: "Calendar" },
];

export function DiscoverFestivals({ festivals, query, onQueryChange, filters, onFiltersChange }) {
  const [activeView, setActiveView] = useState("grid");
  const [visibleCount, setVisibleCount] = useState(2);

  const filtered = useMemo(
    () => filterFestivals(festivals, { query, filters }),
    [festivals, query, filters]
  );

  const allShown = visibleCount >= filtered.length;

  function handleQueryChange(q) {
    onQueryChange(q);
    setVisibleCount(2);
  }

  function handleFiltersChange(f) {
    onFiltersChange(f);
    setVisibleCount(2);
  }

  return (
    <section id="discover" className="scroll-mt-20 bg-muted py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
        <Reveal>
          <SectionHeading
            eyebrow="Discover"
            title="Find your next festival"
            description="Search by name or neighborhood, then filter by date, type, and area to plan the perfect Philly outing."
          />
        </Reveal>

        <div className="mx-auto mt-8 max-w-[660px] md:mt-12">
          <SearchBar
            onSearch={handleQueryChange}
            filters={filters}
            onFilterChange={handleFiltersChange}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              aria-pressed={activeView === view.id}
              className={cn(
                "rounded-full border px-5 py-2 font-ui text-sm font-medium transition-colors",
                activeView === view.id
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:text-primary"
              )}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="mt-10 md:mt-12">
          {activeView === "grid" && (
            <>
              <p className="mb-6 font-body text-sm text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "festival" : "festivals"} found
              </p>
              {filtered.length > 0 ? (
                <>
                  <div
                    className={cn(
                      "grid grid-cols-1 gap-6 sm:grid-cols-2",
                      allShown && "lg:grid-cols-3"
                    )}
                  >
                    {filtered.slice(0, visibleCount).map((festival) => (
                      <Reveal key={festival.id} className="h-full">
                        <FestivalCard
                          className="h-full"
                          variant="default"
                          showSave
                          id={festival.id}
                          slug={festival.slug}
                          title={festival.title}
                          date={festival.date}
                          location={festival.location}
                          category={festival.category}
                          badge={festival.badge}
                          bgColor={festival.bgColor}
                          image={festival.image}
                          tags={festival.tags}
                        />
                      </Reveal>
                    ))}
                  </div>
                  {!allShown && (
                    <div className="mt-10 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((count) => count + 2)}
                        className="rounded-full border border-primary bg-background px-6 py-2.5 font-ui text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        See more
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-8 text-center font-body text-muted-foreground">
                  No festivals found matching your filters. Try adjusting your search.
                </p>
              )}
            </>
          )}

          {activeView === "map" && <MapSection festivals={filtered} />}

          {activeView === "calendar" && <CalendarSection festivals={filtered} />}
        </div>
      </div>
    </section>
  );
}

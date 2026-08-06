"use client";

import { useCallback, useMemo, useState } from "react";
import { getFeatured, getUpcoming } from "@/lib/festival-filters";
import { Hero } from "@/components/home/Hero";
import { FeaturedFestivals } from "@/components/home/FeaturedFestivals";
import { DiscoverFestivals } from "@/components/home/DiscoverFestivals";
import { WhyPhilly } from "@/components/home/WhyPhilly";
import { UpcomingThisMonth } from "@/components/home/UpcomingThisMonth";
import { ExploreNeighborhoods } from "@/components/home/ExploreNeighborhoods";
import { CommunityStories } from "@/components/home/CommunityStories";
import { FinalCTA } from "@/components/home/FinalCTA";

export function HomeClient({ festivals, articles, neighborhoods }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ date: "", type: "", area: "" });

  const featured = useMemo(() => getFeatured(festivals, 4), [festivals]);
  const upcoming = useMemo(() => getUpcoming(festivals, 8), [festivals]);

  const handleSelectArea = useCallback((area) => {
    setFilters((prev) => ({ ...prev, area }));
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
      <Hero />
      <FeaturedFestivals festivals={featured} />
      <DiscoverFestivals
        festivals={festivals}
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <WhyPhilly />
      <UpcomingThisMonth festivals={upcoming} />
      <ExploreNeighborhoods neighborhoods={neighborhoods} onSelectArea={handleSelectArea} />
      <CommunityStories articles={articles} />
      <FinalCTA />
    </>
  );
}

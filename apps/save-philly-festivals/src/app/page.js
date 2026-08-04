"use client";

import { useState, useMemo } from "react";
import { FeaturedFestivalCard } from "@/components/shared/FeaturedFestivalCard";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { festivals, articles } from "@/lib/festivals";

function filterByDate(list, dateFilter) {
  if (!dateFilter) return list;
  const now = new Date();
  return list.filter((f) => {
    const d = new Date(f.rawDate);
    if (dateFilter === "this-week") {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return d >= now && d <= weekEnd;
    }
    if (dateFilter === "this-month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "next-month") {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return d.getMonth() === next.getMonth() && d.getFullYear() === next.getFullYear();
    }
    return true;
  });
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ date: "", type: "", area: "" });

  const featured = useMemo(() => festivals.filter((f) => f.badge === "Featured"), []);

  const filteredFestivals = useMemo(() => {
    let result = festivals;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }

    if (filters.type) {
      result = result.filter((f) => f.category === filters.type);
    }

    if (filters.area) {
      result = result.filter((f) => f.location.toLowerCase().includes(filters.area.toLowerCase()));
    }

    result = filterByDate(result, filters.date);

    return result;
  }, [searchQuery, filters]);

  return (
    <>
      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-12 md:px-[81px] md:pb-12 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mt-8 max-w-[513px]">
            <SearchBar
              onSearch={setSearchQuery}
              filters={filters}
              onFilterChange={setFilters}
            />
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3 border-b border-[#848484] pb-6 md:mt-[83px] md:pb-[59px]">
          <button className="flex items-center gap-3 border-b-4 border-black pb-2 font-ui text-sm font-medium text-black md:text-base">
            Featured
          </button>
          <button className="flex items-center gap-3 pb-2 font-ui text-sm font-medium text-black md:text-base">
            Map
          </button>
          <button className="flex items-center gap-3 pb-2 font-ui text-sm font-medium text-black md:text-base">
            Calendar
          </button>
        </div>
      </section>

      <section className="overflow-hidden pb-12">
        <div className="flex gap-4 overflow-x-auto pb-4 px-4 md:gap-[38px] md:pl-[81px] md:pr-[81px]">
          {featured.map((f) => (
            <FeaturedFestivalCard
              key={f.id}
              title={f.title}
              date={f.date}
              location={f.location}
              description={f.description}
              bgColor={f.bgColor}
              badge={f.badge}
              isLight={f.bgColor === "#F6C847"}
            />
          ))}
        </div>

        <div className="mt-4 hidden items-center justify-end gap-[6px] px-4 md:flex md:px-[81px]">
          <span className="size-[9px] rounded-full bg-[#3D3D3D]" />
          <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
          <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
          <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
          <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-[81px] md:py-16">
        <div className="mx-auto max-w-[892px] text-center">
          <h2 className="font-heading text-3xl font-bold leading-tight text-black md:text-[40px] md:leading-[47px]">
            About Philly Fests
          </h2>
          <p className="mt-4 font-serif text-xl leading-snug text-[#45556C] md:mt-6 md:text-[28px] md:leading-[34px]">
            We&apos;re grateful for the support of our incredible community
            partners who make these festivals possible. Every neighborhood in
            Philadelphia has its own rhythm — summer block parties, cultural
            festivals, art walks, food fairs. Philly Festivals brings these
            celebrations together in one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-8 md:px-[81px]">
        <h3 className="font-body text-base font-normal text-black md:text-lg">
          {filters.type ? `${filters.type} Festivals` : "Coming up this month"}
        </h3>

        <div className="mt-6 flex gap-4 overflow-x-auto pb-4 md:mt-10 md:gap-10">
          {filteredFestivals.length > 0 ? (
            filteredFestivals.map((festival) => (
              <FestivalCard
                key={festival.id}
                variant="compact"
                title={festival.title}
                date={festival.date}
                location={festival.location}
                category={festival.category}
                badge={festival.badge}
              />
            ))
          ) : (
            <p className="py-8 font-body text-[#848484]">
              No festivals found matching your filters.
            </p>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            className="flex h-[36px] items-center justify-center rounded-[18px] bg-[#424242] px-[17px] font-ui text-base font-medium text-white"
            style={{ letterSpacing: "-0.198857px" }}
          >
            Learn more
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-12 md:px-[81px] md:pb-16">
        <div
          className="flex flex-col overflow-hidden rounded-2xl md:flex-row md:items-center"
          style={{ backgroundColor: "#1E7BF6" }}
        >
          <div className="w-full shrink-0 bg-[#1E7BF6] px-4 py-6 md:w-[439px] md:px-[21px] md:py-9">
            <p className="font-serif text-xl leading-snug text-[#F6C847] md:text-[28px] md:leading-[34px]">
              Explore hidden gems and local favorites with our trusted guided
              tours!
            </p>
          </div>
          <div className="h-[120px] flex-1 bg-gradient-to-br from-gray-200 to-gray-300 md:h-[195px]" />
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-12 md:px-[81px] md:pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-10">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center gap-[10px] overflow-hidden rounded-[20px] px-[17px] py-[18px]"
              style={{ backgroundColor: article.bgColor }}
            >
              <div className="h-[79px] w-[76px] shrink-0 rounded-[20px] bg-white" />
              <div>
                <h4
                  className="font-body text-sm font-semibold leading-[17px]"
                  style={{ color: article.textColor }}
                >
                  {article.title}
                </h4>
                <p
                  className="mt-2 font-body text-xs leading-[14px]"
                  style={{ color: article.textColor }}
                >
                  {article.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/shared/SearchBar";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { CalendarWidget } from "@/components/shared/CalendarWidget";
import { festivals } from "@/lib/festivals";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Featured", href: "/" },
  { label: "Map", href: "/" },
  { label: "Calendar", href: "/calendar" },
];

function formatDateHeading(dateStr) {
  const d = new Date(dateStr);
  const options = { weekday: "long", month: "long", day: "numeric" };
  return d.toLocaleDateString("en-US", options);
}

function matchesFilters(festival, filters) {
  const { query, type, area } = filters;
  if (query) {
    const q = query.toLowerCase();
    const haystack = [festival.title, festival.location, festival.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (type && type !== "Type" && festival.category !== type) return false;
  if (area && area !== "Area" && festival.location !== area) return false;
  return true;
}

export default function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(10);
  const [currentYear] = useState(2025);

  const [filters, setFilters] = useState({
    query: "",
    date: "Date",
    type: "Type",
    area: "Area",
  });

  const filteredFestivals = useMemo(
    () => festivals.filter((f) => matchesFilters(f, filters)),
    [filters]
  );

  const monthFestivals = useMemo(
    () =>
      filteredFestivals.filter((f) => {
        const d = new Date(f.rawDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }),
    [filteredFestivals, currentMonth, currentYear]
  );

  const festivalDates = useMemo(
    () => monthFestivals.map((f) => f.rawDate),
    [monthFestivals]
  );

  const dayFestivals = useMemo(
    () =>
      monthFestivals.filter((f) => {
        const d = new Date(f.rawDate);
        return d.getDate() === selectedDay;
      }),
    [monthFestivals, selectedDay]
  );

  const groupedByDate = useMemo(() => {
    const groups = {};
    monthFestivals.forEach((f) => {
      if (!groups[f.rawDate]) groups[f.rawDate] = [];
      groups[f.rawDate].push(f);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [monthFestivals]);

  const handlePrevMonth = () =>
    setCurrentMonth((m) => (m === 0 ? 11 : m - 1));
  const handleNextMonth = () =>
    setCurrentMonth((m) => (m === 11 ? 0 : m + 1));

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-12 md:px-[81px] md:pb-16 md:pt-20">
      <div className="mx-auto mt-8 max-w-[513px]">
        <SearchBar onFilter={setFilters} />
      </div>

      <div className="mt-10 flex items-center gap-3 border-b border-[#848484] pb-6 md:mt-[83px] md:pb-[59px]">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={cn(
              "flex items-center gap-3 pb-2 font-ui text-sm font-medium text-black md:text-base",
              tab.label === "Calendar" && "border-b-4 border-black"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-8 md:flex-row md:gap-10">
        <div className="w-full shrink-0 md:w-[380px] lg:w-[427px]">
          <CalendarWidget
            year={currentYear}
            month={currentMonth}
            festivalDates={festivalDates}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <div className="mt-6 flex flex-col gap-6">
            {dayFestivals.length > 0 && (
              <div>
                <h3 className="font-heading text-lg font-medium leading-[21px] text-black md:text-[22px] md:leading-[26px]">
                  {formatDateHeading(dayFestivals[0].rawDate)}
                </h3>
                <p className="mt-1 font-body text-xs font-light leading-[14px] text-[#848484]">
                  {dayFestivals.length}{" "}
                  {dayFestivals.length === 1 ? "Festival" : "Festivals"}
                </p>
                <div className="mt-3 space-y-3">
                  {dayFestivals.map((f) => (
                    <FestivalCard
                      key={f.id}
                      variant="calendar"
                      id={f.id}
                      title={f.title}
                      date={f.date}
                      location={f.location}
                      category={f.category}
                      bgColor={f.bgColor}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-8">
          {groupedByDate.map(([dateStr, fests]) => (
            <div key={dateStr}>
              <h3 className="font-heading text-lg font-medium leading-[21px] text-black md:text-[22px] md:leading-[26px]">
                {formatDateHeading(dateStr)}
              </h3>
              <p className="mt-1 font-body text-xs font-light leading-[14px] text-[#848484]">
                {fests.length}{" "}
                {fests.length === 1 ? "Festival" : "Festivals"}
              </p>
              <div className="mt-3 h-px bg-[#848484]" />
              <div className="mt-4 flex flex-col gap-4">
                {fests.map((f) => (
                  <FestivalCard
                    key={f.id}
                    variant="calendar"
                    id={f.id}
                    title={f.title}
                    date={f.date}
                    location={f.location}
                    category={f.category}
                    bgColor={f.bgColor}
                    className={
                      fests.length === 1
                        ? "max-w-full md:max-w-[893px]"
                        : "max-w-full md:max-w-[428px]"
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          {groupedByDate.length === 0 && (
            <p className="font-body text-base text-[#848484]">
              No festivals match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

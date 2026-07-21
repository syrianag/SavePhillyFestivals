"use client";

import { useState, useMemo } from "react";
import { CalendarWidget } from "@/components/shared/CalendarWidget";
import { SearchBar } from "@/components/shared/SearchBar";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { Toast } from "@/components/shared/Toast";
import { useSchedule } from "@/features/schedule/schedule-context";
import { downloadICS } from "@/lib/ics";
import { festivals } from "@/lib/festivals";
import { Download } from "lucide-react";

function formatDateKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDate(list) {
  const map = {};
  list.forEach((f) => {
    const key = formatDateKey(f.rawDate);
    if (!map[key]) map[key] = [];
    map[key].push(f);
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr);
  return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

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

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ date: "", type: "", area: "" });

  const {
    savedIds,
    isInSchedule,
    toggleFestival,
    removeFestival,
    savedCount,
  } = useSchedule();

  const [toast, setToast] = useState(null);

  function handleRemove(id) {
    const fest = festivals.find((f) => f.id === id);
    removeFestival(id);
    setToast({ message: `${fest?.title || "Festival"} removed from your schedule` });
  }

  function handleExport() {
    const saved = festivals.filter((f) => savedIds.includes(f.id));
    if (saved.length > 0) downloadICS(saved);
  }

  const festivalDates = useMemo(() => festivals.map((f) => f.rawDate), []);

  const grouped = useMemo(() => {
    let filtered = festivals;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }

    if (filters.type) {
      filtered = filtered.filter((f) => f.category === filters.type);
    }

    if (filters.area) {
      filtered = filtered.filter((f) => f.location.toLowerCase().includes(filters.area.toLowerCase()));
    }

    filtered = filterByDate(filtered, filters.date);

    return groupByDate(filtered);
  }, [searchQuery, filters]);

  return (
    <div className="min-h-screen bg-[#111111]">
      <div className="mx-auto flex w-full max-w-[1440px] gap-[32px] px-4 py-8 md:px-8">
        {/* Left Sidebar */}
        <aside className="sticky top-24 hidden w-[300px] shrink-0 flex-col gap-6 lg:flex xl:w-[380px]">
          <CalendarWidget
            year={year}
            month={month}
            festivalDates={festivalDates}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onPrevMonth={() => {
              if (month === 0) {
                setMonth(11);
                setYear(year - 1);
              } else {
                setMonth(month - 1);
              }
            }}
            onNextMonth={() => {
              if (month === 11) {
                setMonth(0);
                setYear(year + 1);
              } else {
                setMonth(month + 1);
              }
            }}
          />

          {/* Schedule Builder Section */}
          <div className="flex flex-col gap-4">
            <h2 className="font-body text-lg font-bold text-white">
              Schedule Builder
            </h2>

            {savedCount > 0 ? (
              <div className="flex flex-col gap-2.5">
                {festivals
                  .filter((f) => isInSchedule(f.id))
                  .map((f) => (
                    <FestivalCard
                      key={f.id}
                      variant="schedule"
                      id={f.id}
                      title={f.title}
                      bgColor={f.bgColor}
                      onRemove={handleRemove}
                    />
                  ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-[#333333] bg-[#1A1A1A] px-4 py-6 text-center font-body text-sm text-[#848484]">
                No festivals saved yet. Click &ldquo;Save&rdquo; on any festival
                to add it to your schedule.
              </p>
            )}

            {savedCount > 0 && (
              <button
                onClick={handleExport}
                className="flex h-9 items-center justify-center gap-2 rounded-full border border-[#848484] bg-transparent px-4 font-body text-base font-medium text-[#848484] transition-colors hover:border-white hover:text-white"
              >
                <Download className="size-4" />
                Export to calendar
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <SearchBar
            onSearch={setSearchQuery}
            filters={filters}
            onFilterChange={setFilters}
          />

          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[#333333] bg-[#1A1A1A] py-16">
              <p className="font-body text-lg text-[#848484]">
                No festivals found.
              </p>
            </div>
          ) : (
            grouped.map(([dateKey, items]) => (
              <section key={dateKey} className="flex flex-col gap-4">
                <h3 className="border-b border-[#333333] pb-2 font-body text-xl font-bold text-white">
                  {formatDisplayDate(dateKey)}
                </h3>

                {items.length === 1 ? (
                  <FestivalCard
                    variant="long"
                    {...items[0]}
                    showSave
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {items.map((f) => (
                      <FestivalCard
                        key={f.id}
                        variant="long"
                        {...f}
                        showSave
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}
        </main>
      </div>

      {/* Mobile Schedule Builder (bottom sheet on small screens) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#333333] bg-[#111111] p-4 lg:hidden">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-body text-sm text-white">
              {savedCount} saved
            </span>
            <button
              onClick={handleExport}
              disabled={savedCount === 0}
              className="flex h-8 items-center gap-2 rounded-full border border-[#848484] bg-transparent px-3 font-body text-sm font-medium text-[#848484] transition-colors hover:border-white hover:text-white disabled:opacity-40"
            >
              <Download className="size-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>

      <Toast
        message={toast?.message}
        visible={!!toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

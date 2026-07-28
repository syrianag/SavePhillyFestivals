"use client";

import { useState, useMemo } from "react";
import { CalendarWidget } from "@/components/shared/CalendarWidget";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { Toast } from "@/components/shared/Toast";
import { useSchedule } from "@/features/schedule/schedule-context";
import { downloadICS } from "@/lib/ics";
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

export function CalendarSection({ festivals }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  const {
    savedIds,
    isInSchedule,
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

  const festivalDates = useMemo(() => festivals.map((f) => f.rawDate), [festivals]);

  const grouped = useMemo(() => groupByDate(festivals), [festivals]);

  return (
    <>
      <div className="flex w-full gap-8">
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

          <div className="flex flex-col gap-4">
            <h2 className="font-body text-lg font-bold text-black">
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
              <p className="rounded-2xl border border-border bg-muted px-4 py-6 text-center font-body text-sm text-brand-text-muted">
                No festivals saved yet. Click &ldquo;Save&rdquo; on any festival
                to add it to your schedule.
              </p>
            )}

            {savedCount > 0 && (
              <button
                onClick={handleExport}
                className="flex h-9 items-center justify-center gap-2 rounded-full border border-brand-text-gray bg-transparent px-4 font-body text-base font-medium text-brand-text-gray transition-colors hover:border-brand-dark hover:text-brand-dark"
              >
                <Download className="size-4" />
                Export to calendar
              </button>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-6">
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
              <p className="font-body text-lg text-brand-text-muted">
                No festivals found.
              </p>
            </div>
          ) : (
            grouped.map(([dateKey, items]) => (
              <section key={dateKey} className="flex flex-col gap-4">
                <h3 className="border-b border-border pb-2 font-body text-xl font-bold text-black">
                  {formatDisplayDate(dateKey)}
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {items.map((f) => (
                    <FestivalCard
                      key={f.id}
                      variant="default"
                      id={f.id}
                      title={f.title}
                      date={f.date}
                      location={f.location}
                      category={f.category}
                      badge={f.badge}
                      bgColor={f.bgColor}
                      tags={f.tags}
                      slug={f.slug}
                      showSave
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white p-4 lg:hidden">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-body text-sm text-brand-text-muted">
              {savedCount} saved
            </span>
            <button
              onClick={handleExport}
              disabled={savedCount === 0}
              className="flex h-8 items-center gap-2 rounded-full border border-brand-text-gray bg-transparent px-3 font-body text-sm font-medium text-brand-text-gray transition-colors hover:border-brand-dark hover:text-brand-dark disabled:opacity-40"
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
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download, Trash2, X } from "lucide-react";
import { CalendarWidget } from "@/components/shared/CalendarWidget";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { Toast } from "@/components/shared/Toast";
import { formatPhiladelphiaDateTime } from "@/features/festivals/public-festival";
import { useSchedule } from "@/features/schedule/schedule-context";
import { findOverlappingEvents, SCHEDULE_STORAGE_VERSION } from "@/features/schedule/schedule-storage";
import { ScheduleEmailForm } from "@/features/schedule-email/ScheduleEmailForm";
import { downloadCalendarBlob } from "@/lib/ics";

const colors = ["#1E7BF6", "#206C4E", "#F6C847", "#FE7D0C", "#FF8577"];

function toCard(festival, index) {
  return {
    id: festival.id,
    title: festival.name,
    date: festival.dateLabel,
    rawDate: festival.start_date,
    location: festival.locationLabel,
    category: festival.categories[0]?.name || "Community",
    tags: festival.tags.map((tag) => tag.name),
    description: festival.description,
    bgColor: colors[index % colors.length],
    image: festival.image_url,
    href: `/festivals/${festival.slug}`,
  };
}

function formatDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "tbd";
  return date.toISOString().slice(0, 10);
}

function groupByDate(list) {
  const groups = new Map();
  for (const festival of list) {
    const key = formatDateKey(festival.rawDate);
    groups.set(key, [...(groups.get(key) || []), festival]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function filterByDate(list, dateFilter) {
  if (!dateFilter) return list;
  const now = new Date();
  return list.filter((festival) => {
    const date = new Date(festival.rawDate);
    if (dateFilter === "this-week") {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return date >= now && date <= weekEnd;
    }
    if (dateFilter === "this-month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "next-month") {
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return date.getMonth() === next.getMonth() && date.getFullYear() === next.getFullYear();
    }
    return true;
  });
}

function ScheduleRow({ title, detail, onRemove, stale = false }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/60 bg-white px-3.5 py-3 text-slate-800 shadow-2xs hover:shadow-xs transition-shadow">
      <div className="min-w-0">
        <p className="font-body text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 font-ui text-xs text-slate-500">{detail}</p>
        {stale && (
          <p className="mt-1 font-ui text-xs text-amber-600 font-medium">
            This selection is no longer available in the approved festival listing.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${title} from schedule`}
        className="shrink-0 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ScheduleBuilder({ festivals, onToast, headingId }) {
  const { items, remove, clear, hydrated } = useSchedule();
  const [exportPending, setExportPending] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");

  const resolved = useMemo(() => {
    const groups = festivals.map((festival) => ({ festival, parent: null, events: [] }));
    const stale = [];

    for (const item of items) {
      if (item.type === "festival") {
        const group = groups.find(({ festival }) => festival.id === item.id);
        if (group) group.parent = item;
        else stale.push(item);
        continue;
      }

      const group = groups.find(({ festival }) =>
        festival.schedules.some((event) => event.id === item.id)
      );
      const event = group?.festival.schedules.find((candidate) => candidate.id === item.id);
      if (group && event) group.events.push({ item, event });
      else stale.push(item);
    }

    return {
      groups: groups.filter((group) => group.parent || group.events.length),
      stale,
    };
  }, [festivals, items]);

  const overlaps = useMemo(
    () => findOverlappingEvents(resolved.groups.flatMap((group) => group.events.map(({ event }) => event))),
    [resolved.groups]
  );

  function handleClear() {
    if (window.confirm("Clear every festival and event from your schedule?")) {
      clear();
      onToast("Schedule cleared");
    }
  }

  async function handleExport() {
    if (!hydrated || items.length === 0 || exportPending) return;

    setExportPending(true);
    setExportError("");
    setExportMessage("");

    try {
      const response = await fetch("/api/schedules/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: {
            version: SCHEDULE_STORAGE_VERSION,
            items: items.map((item) => ({ type: item.type, id: String(item.id) })),
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Calendar export failed. Please try again.");
      }

      downloadCalendarBlob(await response.blob());
      const omittedCount = Number(response.headers.get("X-Calendar-Omitted-Count") || 0);
      const message = omittedCount > 0
        ? `Calendar downloaded. ${omittedCount} unavailable ${omittedCount === 1 ? "selection was" : "selections were"} omitted; your saved schedule is unchanged.`
        : "Calendar downloaded. Your saved schedule is unchanged.";
      setExportMessage(message);
      onToast("Calendar downloaded");
    } catch (error) {
      setExportError(error instanceof Error
        ? error.message
        : "Calendar export failed. Please try again.");
    } finally {
      setExportPending(false);
    }
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="font-heading text-lg font-bold text-slate-900">
          Schedule Builder
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 font-ui text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Trash2 className="size-3.5" aria-hidden="true" /> Clear all
          </button>
        )}
      </div>

      <p className="font-ui text-xs leading-relaxed text-slate-500">
        Your schedule is saved only in this browser on this device and may be removed when browser data is cleared.
      </p>
      <p className="font-ui text-xs leading-relaxed text-slate-500">
        Calendar exports are snapshots and do not update automatically if festival details change.
      </p>

      {!hydrated ? (
        <p className="rounded-xl border border-slate-200/60 bg-white px-4 py-5 text-center text-sm text-slate-400">
          Loading your schedule…
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-slate-200/60 bg-white px-4 py-5 text-center font-body text-sm text-slate-400">
          No festivals or program events saved yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3" data-testid="saved-schedule">
          {overlaps.length > 0 && (
            <div role="status" className="rounded-xl border border-amber-250 bg-amber-50/60 px-3.5 py-3 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" /> Time overlap warning
              </p>
              {overlaps.map(([left, right]) => (
                <p key={`${left.id}:${right.id}`} className="mt-1 text-xs text-amber-850">
                  {left.title} overlaps with {right.title}. Both remain saved.
                </p>
              ))}
            </div>
          )}

          {resolved.groups.map(({ festival, parent, events }) => (
            <div key={festival.id} className="flex flex-col gap-2">
              <Link
                href={`/festivals/${festival.slug}`}
                className="font-body text-sm font-bold text-indigo-700 underline-offset-2 hover:underline hover:text-indigo-900 transition-colors"
              >
                {festival.name}
              </Link>
              {parent && (
                <ScheduleRow
                  title={festival.name}
                  detail={`Whole festival · ${festival.dateLabel}`}
                  onRemove={() => remove(parent)}
                />
              )}
              {events.map(({ item, event }) => (
                <div key={event.id} className="ml-3">
                  <ScheduleRow
                    title={event.title}
                    detail={`Program event · ${formatPhiladelphiaDateTime(event.start_time) || "Time TBD"}`}
                    onRemove={() => remove(item)}
                  />
                </div>
              ))}
            </div>
          ))}

          {resolved.stale.map((item) => (
            <ScheduleRow
              key={`${item.type}:${typeof item.id}:${String(item.id)}`}
              title={`Unavailable ${item.type}`}
              detail={`Saved ID: ${String(item.id)}`}
              stale
              onRemove={() => remove(item)}
            />
          ))}
        </div>
      )}

      <ScheduleEmailForm items={items} inputId={`${headingId}-email`} />

      <button
        type="button"
        onClick={handleExport}
        disabled={!hydrated || items.length === 0 || exportPending}
        className="flex h-10 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 font-body text-sm font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs hover:shadow-xs"
      >
        <Download className="size-4" aria-hidden="true" />
        {exportPending ? "Preparing calendar…" : "Export to Calendar"}
      </button>
      {exportMessage && (
        <p role="status" aria-live="polite" className="font-ui text-xs text-emerald-700 font-semibold">
          {exportMessage}
        </p>
      )}
      {exportError && (
        <p role="alert" className="font-ui text-xs text-red-750 font-semibold">
          {exportError} Your saved schedule is unchanged.
        </p>
      )}
    </section>
  );
}

export function CalendarClient({ festivals }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ date: "", type: "", area: "" });
  const [toast, setToast] = useState(null);
  const cards = useMemo(() => festivals.map(toCard), [festivals]);

  const grouped = useMemo(() => {
    let filtered = cards;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((festival) =>
        [festival.title, festival.location, festival.category]
          .some((value) => value.toLowerCase().includes(query))
      );
    }
    if (filters.type) filtered = filtered.filter((festival) => festival.category === filters.type);
    if (filters.area) {
      filtered = filtered.filter((festival) =>
        festival.location.toLowerCase().includes(filters.area.toLowerCase())
      );
    }
    return groupByDate(filterByDate(filtered, filters.date));
  }, [cards, filters, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 md:px-8">
        
        {/* Beautiful Glassmorphic Hero Title Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/60 via-slate-50/50 to-rose-50/50 border border-slate-200/50 p-6 sm:p-8 md:p-10 shadow-2xs">
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-indigo-300/10 blur-3xl pointer-events-none" />
          <div className="absolute right-10 bottom-0 size-96 rounded-full bg-rose-200/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-4xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-500/20 mb-3 shadow-3xs">
              📅 Schedule & Planning
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
              Your Festival Calendar
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl font-sans leading-relaxed">
              Plan your journey across Philadelphia&apos;s cultural events. Save festivals, build your personalized schedule, and export to your device calendar.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col lg:flex-row gap-8">
          <aside className="sticky top-24 hidden w-[300px] shrink-0 flex-col gap-6 lg:flex xl:w-[380px]">
            <CalendarWidget
              year={year}
              month={month}
              festivalDates={cards.map((festival) => festival.rawDate)}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onPrevMonth={() => {
                if (month === 0) {
                  setMonth(11);
                  setYear(year - 1);
                } else setMonth(month - 1);
              }}
              onNextMonth={() => {
                if (month === 11) {
                  setMonth(0);
                  setYear(year + 1);
                } else setMonth(month + 1);
              }}
            />
            {/* Wrap ScheduleBuilder in a beautiful card wrapper */}
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-2xs">
              <ScheduleBuilder
                festivals={festivals}
                headingId="saved-schedule-heading-desktop"
                onToast={(message) => setToast({ message })}
              />
            </div>
          </aside>

          <section aria-label="Festival results" className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="lg:hidden">
              <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-2xs mb-2">
                <ScheduleBuilder
                  festivals={festivals}
                  headingId="saved-schedule-heading-mobile"
                  onToast={(message) => setToast({ message })}
                />
              </div>
            </div>
            
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-2xs">
              <SearchBar onSearch={setSearchQuery} filters={filters} onFilterChange={setFilters} />
            </div>

            {grouped.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/60 bg-white py-16 text-center text-slate-500 shadow-2xs">
                No approved festivals found matching your search.
              </div>
            ) : (
              grouped.map(([dateKey, entries]) => (
                <section key={dateKey} className="flex flex-col gap-4">
                  <h3 className="border-b border-slate-200 pb-2 font-heading text-lg font-bold text-slate-900">
                    {dateKey === "tbd"
                      ? "Date to be announced"
                      : new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(`${dateKey}T12:00:00`))}
                  </h3>
                  <div className={entries.length > 1 ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : ""}>
                    {entries.map((festival) => (
                      <FestivalCard
                        key={festival.id}
                        variant="long"
                        id={festival.id}
                        image={festival.image}
                        title={festival.title}
                        date={festival.date}
                        location={festival.location}
                        category={festival.category}
                        badge={festival.badge}
                        bgColor={festival.bgColor}
                        tags={festival.tags}
                        href={festival.href}
                        showSave
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </section>
        </div>
      </div>

      <Toast message={toast?.message} visible={Boolean(toast)} onClose={() => setToast(null)} />
    </div>
  );
}

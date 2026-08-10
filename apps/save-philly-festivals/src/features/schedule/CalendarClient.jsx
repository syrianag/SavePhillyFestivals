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
    /* Every calendar day this festival occupies, computed server-side in the festival's own
     * time zone. The client never parses these back into Dates — that is what previously put
     * the calendar's dots one day away from the filter they drive. */
    dayKeys: festival.day_keys?.length ? festival.day_keys : [],
    location: festival.locationLabel,
    category: festival.categories[0]?.name || "Community",
    tags: festival.tags.map((tag) => tag.name),
    description: festival.description,
    bgColor: colors[index % colors.length],
    image: festival.image_url,
    slug: festival.slug,
  };
}

/* Build the same YYYY-MM-DD key the festival list is grouped by, from the calendar's
 * own year/month/day. Day-of-month alone is ambiguous once the user pages between months. */
function toSelectedDateKey(year, month, day) {
  if (!day) return null;
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysToKey(dayKey, days) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Which calendar days the current view is asking about.
 *
 * One predicate drives both membership and grouping. Previously they disagreed: a festival
 * matched the filter if *any* of its days qualified, but was then always listed under its first
 * day. A market running May through October therefore appeared under a May heading while the
 * user was filtered to September — the dates on screen had no relation to the filter.
 */
function buildDayScope({ selectedDateKey, dateFilter, todayKey }) {
  if (selectedDateKey) return (key) => key === selectedDateKey;

  const [year, month] = todayKey.split("-").map(Number);
  const monthPrefix = (offset) => {
    const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  if (dateFilter === "this-week") {
    const weekEnd = addDaysToKey(todayKey, 7);
    return (key) => key >= todayKey && key <= weekEnd;
  }
  if (dateFilter === "this-month") return (key) => key.startsWith(monthPrefix(0));
  if (dateFilter === "next-month") return (key) => key.startsWith(monthPrefix(1));
  return () => true;
}

/* Groups each festival under the first day it occupies that the current view is actually
 * asking about, so every heading on screen belongs to the active filter. */
function groupByScopedDay(list, inScope) {
  const groups = new Map();
  for (const festival of list) {
    const key = festival.dayKeys.find(inScope) || festival.dayKeys[0] || "tbd";
    groups.set(key, [...(groups.get(key) || []), festival]);
  }
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

/* Compact "Mon D" for a day key, formatted in UTC because a day key is a calendar day with no
 * instant attached — zoning it would shift it back a day. */
function formatDayKeyShort(dayKey, withYear = false) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/* A run long enough that a continuous multi-day festival is unlikely to be the whole story.
 * Only 8 of the published catalog exceed this, and they are the ones that read as errors when
 * they surface in a month they did not start in. */
const EXTENDED_RUN_DAYS = 13;

/**
 * The date a card should show, relative to the day it is filed under.
 *
 * A festival spanning months is listed under whichever of its days the current filter covers,
 * so printing its overall start date contradicts the heading directly above it — a market
 * running May through October read as "Sunday, May 17" beneath an "August 1" heading.
 *
 * The label therefore answers "why is this here?": on its opening day it shows the full run,
 * and on any later day it says it is still going and when it ends. It deliberately never claims
 * the festival "recurs" — the imported data carries a start and an end date and nothing about
 * which days within that window it actually happens, so asserting a pattern would be a guess.
 */
function scopedDateLabel(festival, groupDayKey) {
  const { dayKeys } = festival;
  if (dayKeys.length < 2) return festival.date;

  const first = dayKeys[0];
  const last = dayKeys[dayKeys.length - 1];
  if (groupDayKey === first) {
    return `Runs ${formatDayKeyShort(first)} \u2013 ${formatDayKeyShort(last, true)}`;
  }
  return `Ongoing \u00b7 through ${formatDayKeyShort(last, true)}`;
}

/* Flags a run long enough to be worth calling out at a glance, so the card reads as deliberate
 * rather than as a stray date. */
function runBadge(festival) {
  const { dayKeys } = festival;
  if (dayKeys.length < 2) return undefined;
  return dayKeys.length > EXTENDED_RUN_DAYS ? "Ongoing" : `${dayKeys.length} days`;
}

function formatSelectedDateLabel(dateKey) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(`${dateKey}T12:00:00`));
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
            <div role="status" className="rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-3 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" /> Time overlap warning
              </p>
              {overlaps.map(([left, right]) => (
                <p key={`${left.id}:${right.id}`} className="mt-1 text-xs text-amber-800">
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
        <p role="alert" className="font-ui text-xs text-red-700 font-semibold">
          {exportError} Your saved schedule is unchanged.
        </p>
      )}
    </section>
  );
}

/* `todayKey` is computed on the server in Philadelphia time and passed down. Deriving it from
 * `new Date()` here made the server (UTC on Vercel) and the browser disagree about the current
 * day, which shifted the initial month and the "today" highlight during hydration. */
export function CalendarClient({ festivals, todayKey, includePast = false }) {
  const [todayYear, todayMonth] = todayKey.split("-").map(Number);
  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth - 1);
  /* Starts unselected so the page never loads pre-filtered to a day with no festivals. */
  const [selectedDay, setSelectedDay] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  /* Defaults to the current month: the calendar exists to answer "what is on now", and an
   * unfiltered list opened on every festival in the catalog. */
  const [filters, setFilters] = useState({ date: "this-month", type: "", area: "" });
  const [toast, setToast] = useState(null);
  const cards = useMemo(() => festivals.map(toCard), [festivals]);

  const selectedDateKey = toSelectedDateKey(year, month, selectedDay);

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
    /* A festival is in view when any day it spans is in scope, and it is then listed under
     * that day — so multi-day festivals are reachable from every one of their days and always
     * appear under a date the current filter actually covers. */
    const inScope = buildDayScope({ selectedDateKey, dateFilter: filters.date, todayKey });
    filtered = filtered.filter((festival) => festival.dayKeys.some(inScope));
    return groupByScopedDay(filtered, inScope);
  }, [cards, filters, searchQuery, selectedDateKey, todayKey]);

  /* Every day that has at least one festival, so the widget's dots come from exactly the same
   * keys the filter matches on. */
  const festivalDayKeys = useMemo(
    () => new Set(cards.flatMap((festival) => festival.dayKeys)),
    [cards]
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 md:px-8">
        
        {/* Beautiful Glassmorphic Hero Title Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/60 via-slate-50/50 to-rose-50/50 border border-slate-200/50 p-6 sm:p-8 md:p-10 shadow-2xs">
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-indigo-300/10 blur-3xl pointer-events-none" />
          <div className="absolute right-10 bottom-0 size-96 rounded-full bg-rose-200/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-4xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-500/20 mb-3 shadow-2xs">
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
              festivalDayKeys={festivalDayKeys}
              todayKey={todayKey}
              selectedDay={selectedDay}
              onSelectDay={(day) => setSelectedDay((current) => (current === day ? null : day))}
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

            {selectedDateKey && (
              <div
                aria-live="polite"
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-5 py-3.5"
              >
                <p className="font-ui text-sm font-semibold text-slate-800">
                  Showing festivals on {formatSelectedDateLabel(selectedDateKey)}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-ui text-sm font-bold text-slate-800 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  Clear date
                </button>
              </div>
            )}

            {/* The calendar defaults to the current month forward. Past festivals stay published
              * and reachable — this is the explicit way back to them. */}
            <p className="font-ui text-sm text-slate-500">
              {includePast
                ? "Showing all festivals, including ones that have already happened. "
                : "Showing festivals from this month onward. "}
              <Link
                href={includePast ? "/calendar" : "/calendar?date=all"}
                className="font-semibold text-slate-800 underline underline-offset-2 hover:text-slate-900"
              >
                {includePast ? "Show upcoming only" : "Include past festivals"}
              </Link>
            </p>

            {grouped.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/60 bg-white py-16 text-center text-slate-500 shadow-2xs">
                {selectedDateKey
                  ? `No approved festivals on ${formatSelectedDateLabel(selectedDateKey)}. Pick another date or clear the filter.`
                  : "No approved festivals found matching your search."}
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
                        id={festival.id}
                        image={festival.image}
                        title={festival.title}
                        date={scopedDateLabel(festival, dateKey)}
                        location={festival.location}
                        category={festival.category}
                        badge={runBadge(festival)}
                        bgColor={festival.bgColor}
                        tags={festival.tags}
                        slug={festival.slug}
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

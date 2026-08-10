import { getPublicFestivalCatalog } from "@/features/festivals/festival-queries";
import { datePartsInTimeZone } from "@/features/festivals/discovery";
import { CalendarClient } from "@/features/schedule/CalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }) {
  const params = await searchParams;
  /* `?date=all` opts out of the default current-month-forward bound so past festivals stay
   * browsable from the calendar, not only from their detail pages. */
  const includePast = params?.date === "all";
  const festivals = await getPublicFestivalCatalog(includePast ? { date: "all" } : {});

  /* Resolved server-side in Philadelphia time. Letting the client derive "today" from its own
   * clock made the server (UTC in production) and the browser disagree during hydration. */
  const today = datePartsInTimeZone(new Date());
  const todayKey = `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;

  return <CalendarClient festivals={festivals} todayKey={todayKey} includePast={includePast} />;
}

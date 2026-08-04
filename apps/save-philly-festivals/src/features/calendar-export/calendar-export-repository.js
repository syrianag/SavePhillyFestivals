import { mapCalendarSelections } from "@/features/calendar-export/calendar-export-resolution";

const festivalCalendarSelect = Object.freeze({
  id: true,
  name: true,
  slug: true,
  description: true,
  location: true,
  start_date: true,
  end_date: true,
  calendar_date_type: true,
  time_zone: true,
  all_day_start: true,
  all_day_end: true,
  calendar_status: true,
  calendar_sequence: true,
  calendar_published_at: true,
  created_at: true,
  updated_at: true,
});

const parentCalendarSelect = Object.freeze({
  id: true,
  slug: true,
  location: true,
  status: true,
  calendar_status: true,
  calendar_sequence: true,
  calendar_published_at: true,
  updated_at: true,
});

const eventCalendarSelect = Object.freeze({
  id: true,
  title: true,
  description: true,
  location: true,
  start_time: true,
  end_time: true,
  calendar_date_type: true,
  time_zone: true,
  all_day_start: true,
  all_day_end: true,
  calendar_status: true,
  calendar_sequence: true,
  calendar_published_at: true,
  created_at: true,
  updated_at: true,
  festival: { select: parentCalendarSelect },
});

const validFestivalInterval = {
  OR: [
    { calendar_date_type: "timed", start_date: { not: null }, end_date: { not: null } },
    { calendar_date_type: "all_day", all_day_start: { not: null }, all_day_end: { not: null } },
  ],
};

const validEventInterval = {
  OR: [
    { calendar_date_type: "timed", start_time: { not: null }, end_time: { not: null } },
    { calendar_date_type: "all_day", all_day_start: { not: null }, all_day_end: { not: null } },
  ],
};

const availableFestival = {
  AND: [
    {
      OR: [
        { status: "approved", calendar_status: { not: "canceled" } },
        { calendar_status: "canceled", calendar_published_at: { not: null } },
      ],
    },
    validFestivalInterval,
  ],
};

const availableParent = {
  OR: [
    { status: "approved", calendar_status: { not: "canceled" } },
    { calendar_status: "canceled", calendar_published_at: { not: null } },
  ],
};

const availableEvent = {
  AND: [
    {
      OR: [
        { calendar_status: { not: "canceled" }, festival: availableParent },
        {
          calendar_status: "canceled",
          calendar_published_at: { not: null },
          festival: availableParent,
        },
      ],
    },
    validEventInterval,
  ],
};

async function loadProductionPrisma() {
  return (await import("@/lib/db")).prisma;
}

export function createCalendarExportRepository({ prisma, getPrisma } = {}) {
  const resolvePrisma = async () => prisma || (getPrisma ? getPrisma() : loadProductionPrisma());

  return {
    async resolveSelection(items, { siteOrigin }) {
      const client = await resolvePrisma();
      const festivalIds = items.filter(({ type }) => type === "festival").map(({ id }) => id);
      const eventIds = items.filter(({ type }) => type === "event").map(({ id }) => id);
      const [festivals, events] = await Promise.all([
        festivalIds.length
          ? client.festival.findMany({
              where: { id: { in: festivalIds }, ...availableFestival },
              select: festivalCalendarSelect,
            })
          : [],
        eventIds.length
          ? client.schedule.findMany({
              where: { id: { in: eventIds }, ...availableEvent },
              select: eventCalendarSelect,
            })
          : [],
      ]);

      return mapCalendarSelections(items, { festivals, events }, siteOrigin);
    },
  };
}

export const calendarExportRepository = createCalendarExportRepository();
export { eventCalendarSelect, festivalCalendarSelect };

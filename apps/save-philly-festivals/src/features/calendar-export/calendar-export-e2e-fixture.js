import { mapCalendarSelections } from "@/features/calendar-export/calendar-export-resolution";

const publishedAt = new Date("2026-07-01T12:00:00.000Z");
const festival = {
  id: "e2e-approved-1",
  name: "Riverfront Arts Festival",
  slug: "riverfront-arts-festival",
  description: "Local artists, food, and performances along the Delaware River.",
  location: "Penn's Landing",
  start_date: new Date("2026-09-12T14:00:00.000Z"),
  end_date: new Date("2026-09-13T22:00:00.000Z"),
  calendar_date_type: "timed",
  time_zone: "America/New_York",
  all_day_start: null,
  all_day_end: null,
  calendar_status: "confirmed",
  calendar_sequence: 0,
  calendar_published_at: publishedAt,
  created_at: publishedAt,
  updated_at: publishedAt,
};
const event = {
  id: "fixture-program-1",
  title: "Community Arts Parade",
  description: null,
  location: "Riverfront Promenade",
  start_time: new Date("2026-09-12T16:00:00.000Z"),
  end_time: new Date("2026-09-12T17:00:00.000Z"),
  calendar_date_type: "timed",
  time_zone: "America/New_York",
  all_day_start: null,
  all_day_end: null,
  calendar_status: "confirmed",
  calendar_sequence: 0,
  calendar_published_at: publishedAt,
  created_at: publishedAt,
  updated_at: publishedAt,
  festival: {
    id: festival.id,
    slug: festival.slug,
    location: festival.location,
    workflow_state: "published",
    first_published_at: publishedAt,
    calendar_status: "confirmed",
    calendar_sequence: 0,
    calendar_published_at: publishedAt,
    updated_at: publishedAt,
  },
};

export function getCalendarExportE2eDependencies() {
  if (process.env.DISCOVERY_E2E_FIXTURE !== "1") return null;
  return {
    repository: {
      async resolveSelection(items, { siteOrigin }) {
        return mapCalendarSelections(items, { festivals: [festival], events: [event] }, siteOrigin);
      },
    },
  };
}

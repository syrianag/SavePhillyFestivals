import { generateCalendarIcs } from "@/features/calendar-export/calendar-export-generator";
import { validateCalendarSiteOrigin } from "@/features/calendar-export/calendar-export-resolution";

export class NoCalendarExportItemsError extends Error {
  constructor() {
    super("None of the selected festivals or events are currently available.");
    this.name = "NoCalendarExportItemsError";
    this.statusCode = 422;
  }
}

export async function exportCalendar(input, { repository, siteUrl }) {
  const siteOrigin = validateCalendarSiteOrigin(siteUrl);
  const resolution = await repository.resolveSelection(input.selection.items, { siteOrigin });
  if (!resolution.records.length) throw new NoCalendarExportItemsError();

  return {
    ics: generateCalendarIcs(resolution.records),
    omittedCount: resolution.omittedCount,
  };
}

export const createCalendarExport = exportCalendar;

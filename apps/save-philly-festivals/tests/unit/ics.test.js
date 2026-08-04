import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadICS, generateICS } from "@/lib/ics";

describe("generateICS", () => {
  it("creates all-day events, escapes text, and omits empty optional fields", () => {
    const rawDate = new Date(2026, 6, 4);

    const calendar = generateICS([
      {
        id: "festival-1",
        rawDate,
        title: "Food, Music; Fun\\Games",
        location: "Market St, Philadelphia",
        description: "First line\nSecond line",
      },
      {
        id: "festival-2",
        rawDate,
        title: "No details",
      },
    ]);

    expect(calendar).toContain("DTSTART;VALUE=DATE:20260704\r\nDTEND;VALUE=DATE:20260705");
    expect(calendar).toContain("SUMMARY:Food\\, Music\\; Fun\\\\Games");
    expect(calendar).toContain("LOCATION:Market St\\, Philadelphia");
    expect(calendar).toContain("DESCRIPTION:First line\\nSecond line");
    expect(calendar).toContain("UID:festival-1@phillyfests.com");
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(calendar.match(/LOCATION:/g)).toHaveLength(1);
    expect(calendar.endsWith("END:VCALENDAR")).toBe(true);
  });

  it("skips entries without a valid date", () => {
    const calendar = generateICS([
      { id: "missing", title: "Missing date" },
      { id: "invalid", rawDate: "not-a-date", title: "Invalid date" },
    ]);

    expect(calendar).not.toContain("BEGIN:VEVENT");
    expect(calendar).toContain("BEGIN:VCALENDAR");
  });
});

describe("downloadICS", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads the generated calendar and releases the object URL", async () => {
    const link = { click: vi.fn(), href: "", download: "" };
    const appendChild = vi.fn();
    const removeChild = vi.fn();
    const createObjectURL = vi.fn(() => "blob:calendar");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("document", {
      createElement: vi.fn(() => link),
      body: { appendChild, removeChild },
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    downloadICS([{ id: "one", rawDate: new Date(2026, 0, 1), title: "New Year" }]);

    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/calendar;charset=utf-8");
    expect(await blob.text()).toContain("SUMMARY:New Year");
    expect(link).toMatchObject({
      href: "blob:calendar",
      download: "philly-festivals-schedule.ics",
    });
    expect(appendChild).toHaveBeenCalledWith(link);
    expect(link.click).toHaveBeenCalledOnce();
    expect(removeChild).toHaveBeenCalledWith(link);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:calendar");
  });
});

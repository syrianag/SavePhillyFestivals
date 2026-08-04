import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadCalendarBlob } from "@/lib/ics";

describe("downloadCalendarBlob", () => {
  afterEach(() => vi.unstubAllGlobals());

  function browserDoubles({ click = vi.fn() } = {}) {
    const link = { click, href: "", download: "", parentNode: null };
    const body = {
      appendChild: vi.fn((child) => { child.parentNode = body; }),
      removeChild: vi.fn((child) => { child.parentNode = null; }),
    };
    const createObjectURL = vi.fn(() => "blob:calendar");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("document", { createElement: vi.fn(() => link), body });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    return { link, body, createObjectURL, revokeObjectURL };
  }

  it("downloads an existing calendar blob with the default filename and cleans up", () => {
    const browser = browserDoubles();
    const blob = new Blob(["BEGIN:VCALENDAR"], { type: "text/calendar; charset=utf-8" });

    downloadCalendarBlob(blob);

    expect(browser.createObjectURL).toHaveBeenCalledWith(blob);
    expect(browser.link).toMatchObject({
      href: "blob:calendar",
      download: "philly-fests-schedule.ics",
    });
    expect(browser.link.click).toHaveBeenCalledOnce();
    expect(browser.body.removeChild).toHaveBeenCalledWith(browser.link);
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:calendar");
  });

  it("supports a caller filename and cleans up even when clicking fails", () => {
    const browser = browserDoubles({ click: vi.fn(() => { throw new Error("blocked"); }) });
    const blob = new Blob(["calendar"]);

    expect(() => downloadCalendarBlob(blob, "custom.ics")).toThrow("blocked");
    expect(browser.link.download).toBe("custom.ics");
    expect(browser.body.removeChild).toHaveBeenCalledWith(browser.link);
    expect(browser.revokeObjectURL).toHaveBeenCalledWith("blob:calendar");
  });

  it("rejects non-Blob input instead of generating content client-side", () => {
    expect(() => downloadCalendarBlob("BEGIN:VCALENDAR")).toThrow(TypeError);
  });
});

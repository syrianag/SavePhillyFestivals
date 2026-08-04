import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/schedules/calendar/route";
import { getCalendarExportE2eDependencies } from "@/features/calendar-export/calendar-export-e2e-fixture";

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFileSync(resolve(projectRoot, path), "utf8");

describe("F-06 source and response security contract", () => {
  afterEach(() => {
    delete process.env.DISCOVERY_E2E_FIXTURE;
    vi.restoreAllMocks();
  });

  it("keeps client ICS code download-only and server content free of private fields/alarms", () => {
    const client = read("src/lib/ics.js");
    const repository = read("src/features/calendar-export/calendar-export-repository.js");
    const generator = read("src/features/calendar-export/calendar-export-generator.js");

    expect(client).toContain('"use client"');
    expect(client).toContain("downloadCalendarBlob");
    expect(client).not.toMatch(/generateICS|BEGIN:VCALENDAR|createEvents/);
    expect(repository).not.toMatch(/contact_email|contact_phone|submitted_by|organizer/);
    expect(generator).not.toMatch(/organizer\s*:|attendees\s*:|alarms\s*:/);
  });

  it("keeps publication and sequence metadata trigger-owned across parent and child updates", () => {
    const schema = read("prisma/schema.prisma");
    const migration = read("prisma/migrations/20260804040000_calendar_export_semantics/migration.sql");

    expect(schema.match(/@@index\(\[calendar_status, calendar_published_at\]\)/g)).toHaveLength(2);
    expect(migration).toContain('NEW."calendar_sequence" := OLD."calendar_sequence" + 1');
    expect(migration).toContain('NEW."calendar_published_at" := OLD."calendar_published_at"');
    expect(migration).toContain('NEW."calendar_published_at" := NULL');
    expect(migration).toContain('CREATE TRIGGER "Festival_stamp_published_schedules_trigger"');
    expect(migration).toContain('NEW."calendar_sequence" > OLD."calendar_sequence"');
    expect(migration).toContain('"calendar_sequence" = "calendar_sequence" + 1');
    expect(migration).toContain("pg_trigger_depth() > 1");
    expect(migration).toContain('UPDATE "Schedule"');
  });

  it("dynamically loads only the production repository and gates the fixture exactly", () => {
    const route = read("src/app/api/schedules/calendar/route.js");
    const fixture = read("src/features/calendar-export/calendar-export-e2e-fixture.js");
    expect(route).toMatch(/await import\([\s\S]*calendar-export-repository/);
    expect(route).not.toMatch(/^import .*calendar-export-repository/m);
    expect(fixture).toContain('process.env.DISCOVERY_E2E_FIXTURE !== "1"');

    process.env.DISCOVERY_E2E_FIXTURE = "true";
    expect(getCalendarExportE2eDependencies()).toBeNull();
    process.env.DISCOVERY_E2E_FIXTURE = "1";
    expect(getCalendarExportE2eDependencies()).not.toBeNull();
  });

  it("serves known fixture records in request order and reports omitted IDs", async () => {
    process.env.DISCOVERY_E2E_FIXTURE = "1";
    const response = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection: { version: 1, items: [
        { type: "event", id: "fixture-program-1" },
        { type: "festival", id: "unknown" },
        { type: "festival", id: "e2e-approved-1" },
      ] } }),
    }));
    const calendar = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="philly-fests-schedule.ics"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-calendar-omitted-count")).toBe("1");
    expect(calendar.indexOf("UID:event-fixture-program-1")).toBeLessThan(calendar.indexOf("UID:festival-e2e-approved-1"));
    expect(calendar).toContain("https://festivals.example/festivals/riverfront-arts-festival");
    expect(calendar).not.toContain("unknown");
  });

  it("returns 400 for invalid JSON/schema and 422 when fixture records do not resolve", async () => {
    process.env.DISCOVERY_E2E_FIXTURE = "1";
    const invalidJson = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{",
    }));
    const invalidSchema = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selection: { version: 1, items: [], extra: true } }),
    }));
    const none = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selection: { version: 1, items: [{ type: "event", id: "unknown" }] } }),
    }));

    expect(invalidJson.status).toBe(400);
    expect(invalidSchema.status).toBe(400);
    expect(none.status).toBe(422);
    expect(none.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects unsupported media types and oversized request bodies", async () => {
    const wrongType = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/jsonp" },
      body: "{}",
    }));
    const oversized = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": "40000" },
      body: "{}",
    }));
    const streamedOversized = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(33 * 1024) }),
    }));

    expect(wrongType.status).toBe(415);
    expect(oversized.status).toBe(413);
    expect(streamedOversized.status).toBe(413);
  });

  it("uses a generic redacted 500 response", async () => {
    delete process.env.DISCOVERY_E2E_FIXTURE;
    delete process.env.DATABASE_URL;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(new Request("https://festivals.example/api/schedules/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection: { version: 1, items: [{ type: "festival", id: "unknown" }] } }),
    }));
    const body = await response.text();
    expect(response.status).toBe(500);
    expect(body).toContain("could not be generated");
    expect(body).not.toContain("DATABASE_URL");
    expect(body).not.toContain("unknown");
    expect(JSON.stringify(log.mock.calls)).not.toContain("unknown");
  });
});

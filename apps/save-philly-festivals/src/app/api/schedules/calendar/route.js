import { getCalendarExportE2eDependencies } from "@/features/calendar-export/calendar-export-e2e-fixture";
import { calendarExportRequestSchema } from "@/features/calendar-export/calendar-export-schema";
import {
  NoCalendarExportItemsError,
  exportCalendar,
} from "@/features/calendar-export/calendar-export-service";

const MAX_REQUEST_BYTES = 32 * 1024;

const RESPONSE_HEADERS = Object.freeze({
  "Content-Type": "text/calendar; charset=utf-8",
  "Content-Disposition": 'attachment; filename="philly-fests-schedule.ics"',
  "Cache-Control": "private, no-store",
});

async function productionDependencies() {
  const { calendarExportRepository } = await import(
    "@/features/calendar-export/calendar-export-repository"
  );
  return { repository: calendarExportRepository };
}

function jsonError(message, status, issues) {
  return Response.json(
    { error: message, ...(issues ? { issues } : {}) },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

async function readBoundedBody(request) {
  if (!request.body) return { text: "", tooLarge: false };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return { text: "", tooLarge: true };
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return { text, tooLarge: false };
}

export async function POST(request) {
  const contentType = request.headers.get("content-type") || "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return jsonError("Content-Type must be application/json.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return jsonError("Calendar export request is too large.", 413);
  }

  let body;
  try {
    const result = await readBoundedBody(request);
    if (result.tooLarge) return jsonError("Calendar export request is too large.", 413);
    body = JSON.parse(result.text);
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = calendarExportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "Invalid calendar export request.",
      400,
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }))
    );
  }

  try {
    const fixtureDependencies = getCalendarExportE2eDependencies();
    const dependencies = fixtureDependencies || await productionDependencies();
    const siteUrl = fixtureDependencies
      ? request.nextUrl?.origin || new URL(request.url).origin
      : process.env.NEXT_PUBLIC_SITE_URL;
    const result = await exportCalendar(parsed.data, { ...dependencies, siteUrl });
    return new Response(result.ics, {
      status: 200,
      headers: {
        ...RESPONSE_HEADERS,
        "X-Calendar-Omitted-Count": String(result.omittedCount),
      },
    });
  } catch (error) {
    if (error instanceof NoCalendarExportItemsError) {
      return jsonError(error.message, error.statusCode);
    }
    console.error("[CALENDAR EXPORT] Request failed without exposing record details.");
    return jsonError("The calendar export could not be generated. Please try again.", 500);
  }
}

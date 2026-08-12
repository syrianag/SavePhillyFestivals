import { handleScheduleCreate, handleScheduleList } from "@/features/schedules/schedule-http";

export const dynamic = "force-dynamic";

export function GET(request, context) { return handleScheduleList(request, context); }
export function POST(request, context) { return handleScheduleCreate(request, context); }

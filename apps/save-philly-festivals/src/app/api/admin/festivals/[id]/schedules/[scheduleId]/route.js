import { handleScheduleDelete, handleScheduleUpdate } from "@/features/schedules/schedule-http";

export const dynamic = "force-dynamic";

export function PATCH(request, context) { return handleScheduleUpdate(request, context); }
export function DELETE(request, context) { return handleScheduleDelete(request, context); }

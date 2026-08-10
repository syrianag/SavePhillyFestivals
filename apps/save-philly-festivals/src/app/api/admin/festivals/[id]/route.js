import { handleAdminDetail, handleAdminUpdate } from "@/features/editorial-workflow/editorial-http";

export const dynamic = "force-dynamic";
export function GET(request, context) { return handleAdminDetail(request, context); }
export function PATCH(request, context) { return handleAdminUpdate(request, context); }

import { handleAdminDetail } from "@/features/editorial-workflow/editorial-http";

export const dynamic = "force-dynamic";
export function GET(request, context) { return handleAdminDetail(request, context); }

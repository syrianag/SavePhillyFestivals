import { handleAdminList } from "@/features/editorial-workflow/editorial-http";

export const dynamic = "force-dynamic";
export function GET(request) { return handleAdminList(request); }

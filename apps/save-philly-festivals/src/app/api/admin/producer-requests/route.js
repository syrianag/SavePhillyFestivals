import { handleAdminRequestList } from "@/features/producer-access/producer-access-http";

export const dynamic = "force-dynamic";
export function GET(request) { return handleAdminRequestList(request); }

import { handleAccessRequest, handleAccessStatus } from "@/features/producer-access/producer-access-http";

export const dynamic = "force-dynamic";
export function GET(request) { return handleAccessStatus(request); }
export function POST(request) { return handleAccessRequest(request); }

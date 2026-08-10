import { handleSponsorCreate, handleSponsorList } from "@/features/sponsors/sponsor-http";

export const dynamic = "force-dynamic";
export function GET(request) { return handleSponsorList(request); }
export function POST(request) { return handleSponsorCreate(request); }

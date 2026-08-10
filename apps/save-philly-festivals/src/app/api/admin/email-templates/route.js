import { handleTemplateCreate, handleTemplateList } from "@/features/producer-access/producer-access-http";

export const dynamic = "force-dynamic";
export function GET(request) { return handleTemplateList(request); }
export function POST(request) { return handleTemplateCreate(request); }

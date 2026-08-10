import { handleAdminDecision } from "@/features/producer-access/producer-access-http";

export const dynamic = "force-dynamic";
export function POST(request, context) { return handleAdminDecision(request, context); }

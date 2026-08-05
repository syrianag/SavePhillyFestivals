import { handleAdminTransition } from "@/features/editorial-workflow/editorial-http";

export const dynamic = "force-dynamic";
export function POST(request, context) { return handleAdminTransition(request, context); }

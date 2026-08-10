import { handleTemplateUpdate } from "@/features/producer-access/producer-access-http";

export const dynamic = "force-dynamic";
export function PATCH(request, context) { return handleTemplateUpdate(request, context); }

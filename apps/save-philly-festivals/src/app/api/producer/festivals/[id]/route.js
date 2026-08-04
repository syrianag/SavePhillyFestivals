import { handleGetOwned, handlePatchOwned } from "@/features/producer-submission/producer-submission-http";

export const dynamic = "force-dynamic";

export function GET(request, context) {
  return handleGetOwned(request, context);
}

export function PATCH(request, context) {
  return handlePatchOwned(request, context);
}

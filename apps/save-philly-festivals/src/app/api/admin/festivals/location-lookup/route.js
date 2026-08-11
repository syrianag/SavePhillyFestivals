import { handleAdminLocationLookup } from "@/features/editorial-workflow/editorial-http";

export function POST(request) {
  return handleAdminLocationLookup(request);
}

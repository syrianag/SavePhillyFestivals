import { handleSetFeatured } from "@/features/editorial-workflow/editorial-http";

export const dynamic = "force-dynamic";
export function POST(request) {
  return handleSetFeatured(request);
}

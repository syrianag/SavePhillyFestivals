import { handleLocationLookup } from "@/features/producer-submission/producer-submission-http";

export function POST(request) {
  return handleLocationLookup(request);
}

import { handleProducerCapabilities } from "@/features/producer-submission/producer-submission-http";

export const dynamic = "force-dynamic";

export function GET(request) {
  return handleProducerCapabilities(request);
}

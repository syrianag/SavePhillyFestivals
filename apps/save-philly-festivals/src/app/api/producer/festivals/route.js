import { handleCreateDraft, handleListOwned } from "@/features/producer-submission/producer-submission-http";

export const dynamic = "force-dynamic";

export function GET(request) {
  return handleListOwned(request);
}

export function POST(request) {
  return handleCreateDraft(request);
}

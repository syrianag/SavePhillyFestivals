import { handleUploadAsset } from "@/features/producer-submission/producer-submission-http";

export const dynamic = "force-dynamic";

export function POST(request, context) {
  return handleUploadAsset(request, context);
}

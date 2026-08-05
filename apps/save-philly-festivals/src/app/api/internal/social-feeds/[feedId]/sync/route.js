import { handleInternalSocialFeedSync } from "@/features/social-feed/social-feed-internal-http";

export const dynamic = "force-dynamic";
export function POST(request, context) { return handleInternalSocialFeedSync(request, context); }

import { handleAdminSocialPostModeration } from "@/features/social-feed/social-feed-http";

export const dynamic = "force-dynamic";
export function POST(request, context) { return handleAdminSocialPostModeration(request, context); }

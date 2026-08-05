import { handleAdminSocialFeedGet, handleAdminSocialFeedPatch } from "@/features/social-feed/social-feed-http";

export const dynamic = "force-dynamic";
export function GET(request, context) { return handleAdminSocialFeedGet(request, context); }
export function PATCH(request, context) { return handleAdminSocialFeedPatch(request, context); }

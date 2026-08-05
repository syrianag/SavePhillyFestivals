import { handleAdminSocialPostsGet } from "@/features/social-feed/social-feed-http";

export const dynamic = "force-dynamic";
export function GET(request, context) { return handleAdminSocialPostsGet(request, context); }

import { handlePasswordResetRequest } from "@/features/password-reset/password-reset-http";

export const dynamic = "force-dynamic";
export function POST(request) { return handlePasswordResetRequest(request); }

import { handleRegister } from "@/features/producer-access/producer-access-http";

export const dynamic = "force-dynamic";
export function POST(request) { return handleRegister(request); }

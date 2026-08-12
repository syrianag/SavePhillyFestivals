import { handleNavigationCreate, handleNavigationList } from "@/features/navigation/navigation-http";

export const dynamic = "force-dynamic";

export function GET(request) { return handleNavigationList(request); }
export function POST(request) { return handleNavigationCreate(request); }

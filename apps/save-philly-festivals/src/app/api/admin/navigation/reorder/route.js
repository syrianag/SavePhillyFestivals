import { handleNavigationReorder } from "@/features/navigation/navigation-http";

export const dynamic = "force-dynamic";

export function POST(request) { return handleNavigationReorder(request); }

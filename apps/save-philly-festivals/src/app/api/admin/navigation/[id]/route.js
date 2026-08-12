import { handleNavigationDelete, handleNavigationUpdate } from "@/features/navigation/navigation-http";

export const dynamic = "force-dynamic";

export function PATCH(request, context) { return handleNavigationUpdate(request, context); }
export function DELETE(request, context) { return handleNavigationDelete(request, context); }

import { handleSponsorArchive, handleSponsorUpdate } from "@/features/sponsors/sponsor-http";

export const dynamic = "force-dynamic";
export function PATCH(request, context) { return handleSponsorUpdate(request, context); }
/* Archive rather than hard delete — a sponsor row records a paid placement. */
export function DELETE(request, context) { return handleSponsorArchive(request, context); }

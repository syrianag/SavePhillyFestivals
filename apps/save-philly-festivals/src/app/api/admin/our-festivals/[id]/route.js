import { handleOurFestivalsArchive, handleOurFestivalsDetail, handleOurFestivalsUpdate } from "@/features/our-festivals/our-festivals-http";

export function GET(request, context) { return handleOurFestivalsDetail(request, context); }
export function PATCH(request, context) { return handleOurFestivalsUpdate(request, context); }
export function DELETE(request, context) { return handleOurFestivalsArchive(request, context); }

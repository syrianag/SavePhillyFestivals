import { handleOurFestivalsCreate, handleOurFestivalsList } from "@/features/our-festivals/our-festivals-http";

export function GET(request) { return handleOurFestivalsList(request); }
export function POST(request) { return handleOurFestivalsCreate(request); }

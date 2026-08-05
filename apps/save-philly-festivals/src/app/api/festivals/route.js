import { NextResponse } from "next/server";
import { getPublicFestivalCatalog } from "@/features/festivals/festival-queries";

export async function GET() {
  return NextResponse.json({ festivals: await getPublicFestivalCatalog() }, { headers: { "Cache-Control": "public, max-age=60" } });
}
export function POST() {
  return NextResponse.json({ error: "Legacy festival creation is retired. Use the producer submission workflow." }, { status: 410 });
}

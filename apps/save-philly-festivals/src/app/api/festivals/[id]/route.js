import { NextResponse } from "next/server";
import { getApprovedFestivalById } from "@/features/festivals/festival-queries";

export async function GET(_, { params }) {
  const { id } = await params;
  const festival = await getApprovedFestivalById(id);
  if (!festival) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(festival, { headers: { "Cache-Control": "public, max-age=60" } });
}
export function PUT() {
  return NextResponse.json({ error: "Legacy festival mutation is retired." }, { status: 410 });
}
export function DELETE() {
  return NextResponse.json({ error: "Festival hard-delete is disabled; use archival workflow." }, { status: 410 });
}

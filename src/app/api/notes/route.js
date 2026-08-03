import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getNotes, createNote } from "@/features/notes/note-queries";
import { createNoteSchema } from "@/features/notes/note-schemas";
import { validate } from "@/lib/validate";

export async function GET(request) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") || undefined;
  const entityId = searchParams.get("entityId") || undefined;

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  const result = await getNotes({ entityType, entityId });
  return NextResponse.json(result);
}

export async function POST(request) {
  await requireAdmin();

  const body = await request.json();
  const result = validate(createNoteSchema, body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", errors: result.errors },
      { status: 400 }
    );
  }

  const note = await createNote(result.data);
  return NextResponse.json({ note }, { status: 201 });
}

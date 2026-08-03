import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { deleteNote } from "@/features/notes/note-queries";

export async function DELETE(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  try {
    await deleteNote(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete note" },
      { status: 400 }
    );
  }
}

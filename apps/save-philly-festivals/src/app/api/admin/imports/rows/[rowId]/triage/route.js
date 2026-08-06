import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const session = await requireAdmin();
    const { rowId } = await params;
    const body = await request.json().catch(() => ({}));
    const { review_reason, disposition } = body;

    // Check if the row exists
    const row = await prisma.festivalImportRow.findUnique({
      where: { id: rowId }
    });

    if (!row) {
      return NextResponse.json({ error: "Import row not found" }, { status: 404 });
    }

    const dataToUpdate = {
      review_reason: review_reason || null,
      reviewed_by_user_id: session.user.id,
      reviewed_at: new Date(),
    };

    if (disposition) {
      dataToUpdate.disposition = disposition;
    }

    const updatedRow = await prisma.festivalImportRow.update({
      where: { id: rowId },
      data: dataToUpdate,
      include: {
        issues: true
      }
    });

    return NextResponse.json({ success: true, row: updatedRow });
  } catch (error) {
    console.error("POST /api/admin/imports/rows/[rowId]/triage error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

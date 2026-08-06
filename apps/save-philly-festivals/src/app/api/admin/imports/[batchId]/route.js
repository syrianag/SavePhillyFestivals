import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    await requireAdmin();
    const { batchId } = await params;

    const { searchParams } = new URL(request.url);
    const disposition = searchParams.get("disposition");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const batch = await prisma.festivalImportBatch.findUnique({
      where: { id: batchId },
      include: {
        operator: {
          select: { id: true, email: true, name: true }
        },
        reviewer: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const whereClause = {
      batch_id: batchId,
      ...(disposition ? { disposition } : {})
    };

    const [rows, totalRows] = await Promise.all([
      prisma.festivalImportRow.findMany({
        where: whereClause,
        orderBy: { row_number: "asc" },
        skip,
        take: limit,
        include: {
          target_festival: {
            select: { id: true, name: true, slug: true, workflow_state: true }
          },
          prepared_matched_festival: {
            select: { id: true, name: true, slug: true }
          },
          matched_festival: {
            select: { id: true, name: true, slug: true }
          },
          issues: {
            select: { id: true, severity: true, code: true, field: true, message: true }
          }
        }
      }),
      prisma.festivalImportRow.count({ where: whereClause })
    ]);

    return NextResponse.json({
      batch,
      rows,
      pagination: {
        page,
        limit,
        total: totalRows,
        pages: Math.ceil(totalRows / limit)
      }
    });
  } catch (error) {
    console.error("GET /api/admin/imports/[batchId] error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

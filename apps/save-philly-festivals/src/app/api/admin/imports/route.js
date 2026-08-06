import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      prisma.festivalImportBatch.findMany({
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          operator: {
            select: { id: true, email: true, name: true }
          },
          reviewer: {
            select: { id: true, email: true, name: true }
          }
        }
      }),
      prisma.festivalImportBatch.count()
    ]);

    return NextResponse.json({
      batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("GET /api/admin/imports error:", error);
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: 500 });
  }
}

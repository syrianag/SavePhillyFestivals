import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import AdminImportBatchDetail from "@/features/festival-import/AdminImportBatchDetail";

export const dynamic = "force-dynamic";

export default async function AdminImportBatchDetailPage({ params, searchParams }) {
  await requireAdmin();
  const { batchId } = await params;
  const sParams = await searchParams;

  const disposition = sParams?.disposition;
  const requestedPage = parseInt(sParams?.page || "1", 10);
  const page = isNaN(requestedPage) ? 1 : requestedPage;
  const limit = 20;
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
    notFound();
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

  const pagination = {
    page,
    limit,
    total: totalRows,
    pages: Math.ceil(totalRows / limit)
  };

  return (
    <AdminImportBatchDetail 
      initialBatch={batch}
      initialRows={rows}
      pagination={pagination}
      selectedDisposition={disposition}
    />
  );
}

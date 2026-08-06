import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import AdminImportBatchList from "@/features/festival-import/AdminImportBatchList";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const requestedPage = parseInt(params?.page || "1", 10);
  const page = isNaN(requestedPage) ? 1 : requestedPage;
  const limit = 10;
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

  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-heading font-bold text-slate-900">CSV Import Ingestion</h1>
        <p className="mt-2 text-slate-600 max-w-3xl">
          Track background import tasks, review duplicated or quarantined rows, and triage structural validation anomalies.
        </p>
      </header>

      <AdminImportBatchList 
        batches={batches}
        pagination={pagination}
      />
    </div>
  );
}

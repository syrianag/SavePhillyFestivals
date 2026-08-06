import AdminFestivalList from "@/features/editorial-workflow/AdminFestivalList";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { editorialE2ERepository } from "@/features/editorial-workflow/editorial-e2e-fixture";
import { PUBLICATION_STATES } from "@/features/editorial-workflow/publication-policy";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { producerE2EFixtureEnabled, producerE2EState } from "@/features/producer-submission/producer-e2e-fixture";

async function getWorkflowStateCounts() {
  if (producerE2EFixtureEnabled()) {
    const festivals = [...producerE2EState().festivals.values()];
    const counts = {};
    let total = 0;
    for (const f of festivals) {
      counts[f.workflow_state] = (counts[f.workflow_state] || 0) + 1;
      total++;
    }
    return { counts, total };
  } else {
    const [countsArray, total] = await Promise.all([
      prisma.festival.groupBy({
        by: ['workflow_state'],
        _count: true,
      }),
      prisma.festival.count(),
    ]);
    const counts = countsArray.reduce((acc, curr) => {
      acc[curr.workflow_state] = curr._count;
      return acc;
    }, {});
    return { counts, total };
  }
}

export default async function AdminFestivalsPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const requested = params?.state;
  const state = PUBLICATION_STATES.includes(requested) ? requested : undefined;
  
  const requestedPage = parseInt(params?.page || "1", 10);
  const page = isNaN(requestedPage) ? 1 : requestedPage;
  const limit = 10;

  const result = await (editorialE2ERepository() || editorialRepository).list({ state, page, limit });
  const { counts, total } = await getWorkflowStateCounts();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-heading font-bold text-slate-900">Editorial Festivals</h1>
        <p className="mt-2 text-slate-600 max-w-3xl">
          Review, approve, publish, unpublish, cancel, and archive festival submissions with an auditable history.
        </p>
      </header>
      <AdminFestivalList 
        festivals={result.festivals} 
        selectedState={state} 
        pagination={result.pagination}
        counts={counts}
        totalCount={total}
      />
    </div>
  );
}


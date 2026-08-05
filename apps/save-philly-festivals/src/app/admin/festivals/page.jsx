import AdminFestivalList from "@/features/editorial-workflow/AdminFestivalList";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { editorialE2ERepository } from "@/features/editorial-workflow/editorial-e2e-fixture";
import { PUBLICATION_STATES } from "@/features/editorial-workflow/publication-policy";
import { requireAdmin } from "@/lib/auth-helpers";

export default async function AdminFestivalsPage({ searchParams }) {
  await requireAdmin();
  const requested = (await searchParams)?.state;
  const state = PUBLICATION_STATES.includes(requested) ? requested : undefined;
  const result = await (editorialE2ERepository() || editorialRepository).list({ state, page: 1, limit: 100 });
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Editorial festivals</h1><p className="mt-1 text-slate-600">Review, approve, publish, unpublish, cancel, and archive with an auditable revision.</p></header><AdminFestivalList festivals={result.festivals} selectedState={state} /></div>;
}

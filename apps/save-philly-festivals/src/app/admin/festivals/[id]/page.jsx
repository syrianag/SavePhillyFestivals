import { notFound } from "next/navigation";
import AdminFestivalDetail from "@/features/editorial-workflow/AdminFestivalDetail";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { editorialE2ERepository } from "@/features/editorial-workflow/editorial-e2e-fixture";
import { validTransitions } from "@/features/editorial-workflow/editorial-transition-policy";
import { requireAdmin } from "@/lib/auth-helpers";

export default async function AdminFestivalDetailPage({ params }) {
  await requireAdmin();
  const festival = await (editorialE2ERepository() || editorialRepository).findDetail((await params).id);
  if (!festival) notFound();
  return <AdminFestivalDetail initialFestival={{ ...festival, valid_actions: validTransitions(festival.workflow_state) }} />;
}

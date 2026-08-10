import AdminEmailTemplates from "@/features/producer-access/AdminEmailTemplates";
import { producerAccessRepository } from "@/features/producer-access/producer-access-repository";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email templates - Save Philly Festivals" };

export default async function AdminEmailTemplatesPage() {
  await requireAdmin();
  /* Seeds the defaults on first visit so the screen is never empty in a fresh environment. */
  const templates = await producerAccessRepository.ensureDefaultTemplates();
  return <AdminEmailTemplates initialTemplates={templates} />;
}

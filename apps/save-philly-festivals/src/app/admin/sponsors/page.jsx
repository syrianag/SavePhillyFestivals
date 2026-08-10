import AdminSponsorList from "@/features/sponsors/AdminSponsorList";
import { sponsorRepository } from "@/features/sponsors/sponsor-repository";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function AdminSponsorsPage() {
  await requireAdmin();
  const sponsors = await sponsorRepository.list();
  return <AdminSponsorList initialSponsors={sponsors} />;
}

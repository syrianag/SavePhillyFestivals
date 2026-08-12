import AdminOurFestivalsList from "@/features/our-festivals/AdminOurFestivalsList";
import { ourFestivalsRepository } from "@/features/our-festivals/our-festivals-repository";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function AdminOurFestivalsPage() {
  await requireAdmin();
  const items = await ourFestivalsRepository.list();
  return <AdminOurFestivalsList initialItems={items} />;
}

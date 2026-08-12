import AdminNavigationLinks from "@/features/navigation/AdminNavigationLinks";
import { navigationRepository } from "@/features/navigation/navigation-repository";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Navigation - Save Philly Festivals" };

export default async function AdminNavigationPage() {
  await requireAdmin();
  /* Materialises the shipped menu the first time this screen is opened, so an admin edits the
   * real navigation rather than starting from an empty list. Idempotent after that. */
  const links = await navigationRepository.ensureDefaults();
  return <AdminNavigationLinks initialLinks={links} />;
}

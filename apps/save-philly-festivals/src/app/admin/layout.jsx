import AdminNav from "@/components/admin/AdminNav";
import { SkipLink } from "@/components/shared/SkipLink";
import { requireAdmin } from "@/lib/auth-helpers";

export const metadata = {
  title: "Admin Dashboard - Save Philly Festivals",
  description: "Manage festivals, schedules, and submissions",
};

/**
 * Admin chrome. Owns its own navigation and main landmark rather than inheriting the public
 * shell — an editor working in the admin portal has no use for visitor navigation, and
 * rendering both produced two stacked navigation bars.
 */
export default async function AdminLayout({ children }) {
  /* requireAdmin already returns the session, so rendering the nav costs no extra query. */
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SkipLink />
      <AdminNav user={session?.user} />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}

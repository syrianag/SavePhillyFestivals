import { requireAdmin } from "@/lib/auth-helpers";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Admin Dashboard - Save Philly Festivals",
  description: "Manage festivals, schedules, and submissions",
};

export default async function AdminLayout({ children }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-x-auto">
        <div className="container mx-auto px-4 pb-8 pt-16 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}

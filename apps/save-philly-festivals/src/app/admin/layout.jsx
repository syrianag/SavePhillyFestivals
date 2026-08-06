import { requireAdmin } from "@/lib/auth-helpers";

export const metadata = {
  title: "Admin Dashboard - Save Philly Festivals",
  description: "Manage festivals, schedules, and submissions",
};

export default async function AdminLayout({ children }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}

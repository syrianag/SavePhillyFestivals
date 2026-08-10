import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminSchedulesPage() {
  await requireAdmin();

  const schedules = await prisma.schedule.findMany({
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      location: true,
      start_time: true,
      end_time: true,
      performer: true,
      festival: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Schedules</h1>
        <p className="text-muted-foreground">All performance schedules</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto"><table className="w-full min-w-3xl">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3">Festival</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Performer</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No schedules yet.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{s.festival?.name ?? "—"}</td>
                    <td className="px-4 py-3">{s.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.start_time).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(s.start_time).toLocaleTimeString()} – {new Date(s.end_time).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.performer ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </CardContent>
      </Card>
    </div>
  );
}

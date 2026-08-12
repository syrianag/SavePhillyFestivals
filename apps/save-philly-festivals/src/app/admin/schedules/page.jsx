import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scheduleRepository } from "@/features/schedules/schedule-repository";
import { listScheduleOverview } from "@/features/schedules/schedule-service";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Programmes - Save Philly Festivals" };

/**
 * An index, not an editor.
 *
 * This was a flat list of the 50 most recent entries across all festivals, which is not a unit
 * anyone works in — a programme belongs to one festival, and that is where it is edited. It also
 * called `new Date(start_time).toLocaleDateString()` unguarded on a nullable column, so every
 * all-day or undated entry rendered "Invalid Date".
 */
export default async function AdminSchedulesPage() {
  await requireAdmin();
  const { festivals } = await listScheduleOverview({ repository: scheduleRepository });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Programmes</h1>
        <p className="text-muted-foreground">
          Festivals with a published line-up. Open a festival to add or edit its entries.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Festivals with a programme</CardTitle></CardHeader>
        <CardContent>
          {festivals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No festival has a programme yet. Open any festival and use the Programme section to
              add performers and set times.
            </p>
          ) : (
            <ul className="divide-y">
              {festivals.map((festival) => (
                <li key={festival.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/admin/festivals/${festival.id}`} className="font-medium text-slate-900 hover:underline">
                      {festival.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {/* `start_date` is nullable — imported and all-day festivals often carry
                        * none, which is what produced "Invalid Date" here before. */}
                      {festival.start_date
                        ? new Date(festival.start_date).toISOString().slice(0, 10)
                        : "No date recorded"}
                      {" · "}
                      {festival._count.schedules} {festival._count.schedules === 1 ? "entry" : "entries"}
                    </p>
                  </div>
                  <Badge variant="outline">{festival.workflow_state}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

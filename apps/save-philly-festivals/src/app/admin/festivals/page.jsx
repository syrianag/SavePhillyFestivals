import { getFestivals } from "@/features/festivals/festival-queries";
import { requireAdmin } from "@/lib/auth-helpers";
import { FESTIVAL_STATUS, STATUS_COLORS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Eye } from "lucide-react";
import FestivalReviewDialog from "@/components/admin/FestivalReviewDialog";

export default async function AdminFestivalsPage() {
  await requireAdmin();

  const { festivals } = await getFestivals({ limit: 50 });

  const statusBadge = (status) => {
    const colors = STATUS_COLORS[status];
    return colors ? colors.text : "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Festivals</h1>
          <p className="text-muted-foreground">All festival submissions</p>
        </div>
        <Link href="/admin/submit" className="text-sm text-primary hover:underline">
          + New Submission
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {festivals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No festivals yet.
                  </td>
                </tr>
              ) : (
                festivals.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(f.status)}>{f.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <FestivalReviewDialog festival={f}>
                        <Eye className="size-3.5" />
                        Review
                      </FestivalReviewDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

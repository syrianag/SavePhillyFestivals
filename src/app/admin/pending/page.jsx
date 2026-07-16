import { getFestivals } from "@/features/festivals/festival-queries";
import { requireAdmin } from "@/lib/auth-helpers";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Eye } from "lucide-react";
import FestivalReviewDialog from "@/components/admin/FestivalReviewDialog";

export default async function AdminPendingPage() {
  await requireAdmin();

  const { festivals: pending } = await getFestivals({ status: FESTIVAL_STATUS.PENDING, limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Pending Review</h1>
        <p className="text-muted-foreground">
          {pending.length} submission{pending.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nothing pending — all caught up.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((f) => (
            <Card key={f.id}>
              <CardHeader>
                <CardTitle>{f.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  {f.image_url && (
                    <Image
                      src={f.image_url}
                      alt={f.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="h-20 w-20 rounded-lg border object-cover"
                    />
                  )}
                  <div className="space-y-1">
                    {f.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {f.description.slice(0, 100)}
                        {f.description.length > 100 ? "..." : ""}
                      </p>
                    )}
                    <div className="text-sm text-muted-foreground">
                      Submitted by {f.submitted_by ?? "Unknown"}
                      {f.contact_email && ` · ${f.contact_email}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {f.location ?? "No location"} · Submitted{" "}
                      {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <FestivalReviewDialog festival={f}>
                    <Eye className="size-3.5" />
                    Review
                  </FestivalReviewDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

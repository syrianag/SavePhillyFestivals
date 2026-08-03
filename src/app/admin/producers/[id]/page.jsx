import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { STATUS_COLORS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotesSection from "@/components/admin/NotesSection";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  ArrowLeft,
  ExternalLink,
  Mail,
  User,
} from "lucide-react";
import FestivalReviewDialog from "@/components/admin/FestivalReviewDialog";

export default async function ProducerDetailPage({ params }) {
  const session = await requireAdmin();
  const { id } = await params;

  const producer = await prisma.user.findUnique({
    where: { id },
  });

  if (!producer || producer.role !== "producer") {
    notFound();
  }

  const festivals = await prisma.festival.findMany({
    where: { submitted_by: producer.email },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const approvedCount = festivals.filter((f) => f.status === "approved").length;
  const pendingCount = festivals.filter((f) => f.status === "pending").length;
  const draftCount = festivals.filter((f) => f.status === "draft").length;
  const rejectedCount = festivals.filter((f) => f.status === "rejected").length;

  const displayName = producer.name ?? producer.email;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/producers"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Producers
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {(producer.name?.[0] || producer.email[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-heading font-bold">{displayName}</h1>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-3.5" />
              {producer.email}
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-3.5" />
              Member since {new Date(producer.created_at).toLocaleDateString()}
              <Badge variant="outline" className="ml-1 bg-green-50 text-green-700 border-green-200">
                producer
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Festivals
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Calendar className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{festivals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <CheckCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drafts / Rejected
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <FileText className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftCount + rejectedCount}</div>
            <p className="text-xs text-muted-foreground">
              {draftCount} draft{draftCount !== 1 ? "s" : ""} · {rejectedCount} rejected
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Festivals ({festivals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {festivals.length === 0 ? (
            <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
              This producer has not submitted any festivals yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y text-left text-sm font-medium text-muted-foreground">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Categories</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {festivals.map((f) => {
                    const colors = STATUS_COLORS[f.status] || STATUS_COLORS.draft;
                    return (
                      <tr
                        key={f.id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-6 py-3 font-medium">{f.name}</td>
                        <td className="px-6 py-3">
                          <Badge
                            variant="outline"
                            className={`${colors.bg} ${colors.text} border-transparent`}
                          >
                            {f.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">
                          {f.location || "—"}
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">
                          {f.start_date
                            ? new Date(f.start_date).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-wrap gap-1">
                            {f.categories.map((fc) => (
                              <Badge
                                key={fc.category.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {fc.category.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <FestivalReviewDialog festival={f}>
                            <Button variant="ghost" size="icon-sm">
                              <ExternalLink className="size-3.5" />
                            </Button>
                          </FestivalReviewDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesSection
            entityType="producer"
            entityId={producer.id}
            authorEmail={session.user.email}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { requireAdmin } from "@/lib/auth-helpers";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Plus,
  Search,
} from "lucide-react";
import { getProducersWithStats, getProducerStats } from "@/features/producers/producer-queries";

function RelativeTime({ date }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);

  let text;
  if (hours < 1) text = "Just now";
  else if (hours < 24) text = `${hours}h ago`;
  else if (days < 30) text = `${days}d ago`;
  else if (months < 12) text = `${months}mo ago`;
  else text = date.toLocaleDateString();

  return <span className="text-muted-foreground">{text}</span>;
}

export default async function AdminProducersPage() {
  await requireAdmin();

  const [producers, stats] = await Promise.all([
    getProducersWithStats(),
    getProducerStats(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Management</p>
          <h1 className="text-3xl font-heading font-bold">Producers</h1>
          <p className="text-muted-foreground">
            Manage festival producer accounts and their submissions
          </p>
        </div>
        <Link href="/admin/settings">
          <Button className="gap-2">
            <Plus className="size-4" />
            Create Producer
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Producers
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Festival Submissions
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Calendar className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalFestivals}</div>
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
            <div className="text-3xl font-bold">{stats.approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Producers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {producers.length === 0 ? (
            <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
              No producers found. Create a producer account to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-y text-left text-sm font-medium text-muted-foreground">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3 text-center">Festivals</th>
                    <th className="px-6 py-3 text-center">Approved</th>
                    <th className="px-6 py-3 text-center">Pending</th>
                    <th className="px-6 py-3">Last Activity</th>
                    <th className="px-6 py-3">Member Since</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {producers.map((producer) => (
                    <tr
                      key={producer.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {(producer.name?.[0] || producer.email[0] || "?").toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {producer.name || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {producer.email}
                      </td>
                      <td className="px-6 py-3 text-center font-medium">
                        {producer.festivalCount}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="font-medium text-green-600">
                          {producer.approvedCount}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {producer.pendingCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-yellow-50 text-yellow-700 border-yellow-200"
                          >
                            {producer.pendingCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <RelativeTime date={producer.lastSubmission} />
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(producer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1">
                          <Link
                            href={`/admin/producers/${producer.id}`}
                          >
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View ${producer.name || producer.email}`}
                            >
                              <ExternalLink className="size-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

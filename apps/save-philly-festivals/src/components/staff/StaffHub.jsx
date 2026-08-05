import { prisma } from "@/lib/db";
import { STATUS_COLORS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Settings,
} from "lucide-react";

export default async function StaffHub({ user }) {
  const [totalFestivals, pendingFestivals, approvedFestivals, totalSchedules] =
    await Promise.all([
      prisma.festival.count(),
      prisma.festival.count({ where: { workflow_state: "pending_review" } }),
      prisma.festival.count({ where: { workflow_state: "approved" } }),
      prisma.schedule.count(),
    ]);

  const recentFestivals = await prisma.festival.findMany({
    orderBy: { created_at: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      workflow_state: true,
      created_at: true,
    },
  });

  const displayName = user.name ?? user.email;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      <div className="space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">Staff Dashboard</p>
          <h1 className="text-3xl font-heading font-bold">
            Welcome back, {displayName}
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/festivals">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <Calendar className="mr-1 inline-block size-4" />
                  Total Festivals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalFestivals}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/pending">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <Clock className="mr-1 inline-block size-4" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{pendingFestivals}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/festivals">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <CheckCircle className="mr-1 inline-block size-4" />
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{approvedFestivals}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/schedules">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <Users className="mr-1 inline-block size-4" />
                  Total Schedules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalSchedules}</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {recentFestivals.length === 0 ? (
                <p className="text-muted-foreground">No submissions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentFestivals.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{f.name}</span>
                      <Badge
                        className={
                          STATUS_COLORS[f.workflow_state]?.bg && STATUS_COLORS[f.workflow_state]?.text
                            ? `${STATUS_COLORS[f.workflow_state].bg} ${STATUS_COLORS[f.workflow_state].text}`
                            : `${STATUS_COLORS.draft.bg} ${STATUS_COLORS.draft.text}`
                        }
                        variant="outline"
                      >
                        {f.workflow_state.replaceAll("_", " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href="/producer/submit">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Plus className="size-4" />
                  Submit Festival
                </Button>
              </Link>
              <Link href="/admin/festivals">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Eye className="size-4" />
                  View Festivals
                </Button>
              </Link>
              {pendingFestivals > 0 && (
                <Link href="/admin/pending">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <AlertCircle className="size-4" />
                    Review Pending
                    <Badge variant="secondary" className="ml-auto">
                      {pendingFestivals}
                    </Badge>
                  </Button>
                </Link>
              )}
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="size-4" />
                  Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

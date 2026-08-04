import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { FESTIVAL_STATUS, STATUS_COLORS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Settings,
} from "lucide-react";

export default async function AdminPage() {
  const session = await requireAdmin();

  const [totalFestivals, pendingFestivals, approvedFestivals, rejectedFestivals] =
    await Promise.all([
      prisma.festival.count(),
      prisma.festival.count({ where: { status: FESTIVAL_STATUS.PENDING } }),
      prisma.festival.count({ where: { status: FESTIVAL_STATUS.APPROVED } }),
      prisma.festival.count({ where: { status: FESTIVAL_STATUS.REJECTED } }),
    ]);

  const recentFestivals = await prisma.festival.findMany({
    orderBy: { created_at: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      status: true,
      created_at: true,
    },
  });

  const displayName = session.user.name ?? session.user.email;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        <h1 className="text-3xl font-heading font-bold">
          Welcome back, {displayName}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/festivals">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <AlertCircle className="mr-1 inline-block size-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rejectedFestivals}</div>
          </CardContent>
        </Card>
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
                      className={`${STATUS_COLORS[f.status]?.bg} ${STATUS_COLORS[f.status]?.text}`}
                      variant="outline"
                    >
                      {f.status}
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
            <Link href="/admin/submit">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="size-4" />
                Submit Festival
              </Button>
            </Link>
            <Link href="/admin/festivals">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Calendar className="size-4" />
                View All Festivals
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
  );
}

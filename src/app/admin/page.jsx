import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  UserPlus,
  ListChecks,
  ArrowRight,
  Activity,
  Settings,
} from "lucide-react";
import { getProducersWithStats, getRecentActivity } from "@/features/producers/producer-queries";

function StatCard({ title, value, icon: Icon, href, color }) {
  const content = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`flex size-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function ActivityIcon({ type }) {
  const icons = {
    submitted: { icon: Clock, bg: "bg-yellow-100 text-yellow-700" },
    approved: { icon: CheckCircle, bg: "bg-green-100 text-green-700" },
    rejected: { icon: AlertCircle, bg: "bg-red-100 text-red-700" },
    updated: { icon: Calendar, bg: "bg-blue-100 text-blue-700" },
    user_created: { icon: UserPlus, bg: "bg-purple-100 text-purple-700" },
  };

  const config = icons[type] || icons.updated;
  const Icon = config.icon;

  return (
    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
      <Icon className="size-4" />
    </div>
  );
}

function ActivityText({ activity }) {
  switch (activity.type) {
    case "submitted":
      return (
        <>
          <Link href={`/admin/pending`} className="font-medium hover:underline">
            {activity.label}
          </Link>
          <span className="text-muted-foreground"> submitted</span>
        </>
      );
    case "approved":
      return (
        <>
          <Link href={`/admin/festivals`} className="font-medium hover:underline">
            {activity.label}
          </Link>
          <span className="text-green-600"> approved</span>
        </>
      );
    case "rejected":
      return (
        <>
          <Link href={`/admin/festivals`} className="font-medium hover:underline">
            {activity.label}
          </Link>
          <span className="text-red-600"> rejected</span>
        </>
      );
    case "user_created":
      return (
        <>
          <span className="font-medium">{activity.label}</span>
          <span className="text-muted-foreground">
            {" "}joined as {activity.role}
          </span>
        </>
      );
    default:
      return (
        <>
          <span className="font-medium">{activity.label}</span>
          <span className="text-muted-foreground"> updated</span>
        </>
      );
  }
}

function RelativeTime({ date }) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  let text;
  if (minutes < 1) text = "just now";
  else if (minutes < 60) text = `${minutes}m ago`;
  else if (hours < 24) text = `${hours}h ago`;
  else if (days < 7) text = `${days}d ago`;
  else text = date.toLocaleDateString();

  return <span className="text-xs text-muted-foreground">{text}</span>;
}

export default async function AdminPage() {
  const session = await requireAdmin();

  const [
    totalFestivals,
    pendingFestivals,
    approvedFestivals,
    rejectedFestivals,
    totalProducers,
    producers,
    recentActivity,
  ] = await Promise.all([
    prisma.festival.count(),
    prisma.festival.count({ where: { status: FESTIVAL_STATUS.PENDING } }),
    prisma.festival.count({ where: { status: FESTIVAL_STATUS.APPROVED } }),
    prisma.festival.count({ where: { status: FESTIVAL_STATUS.REJECTED } }),
    prisma.user.count({ where: { role: "producer" } }),
    getProducersWithStats(),
    getRecentActivity(8),
  ]);

  const displayName = session.user.name ?? session.user.email;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          <h1 className="text-3xl font-heading font-bold">
            Welcome back, {displayName}
          </h1>
        </div>
        <Link href="/admin/submit">
          <Button className="gap-2">
            <Plus className="size-4" />
            New Festival
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total Festivals"
          value={totalFestivals}
          icon={Calendar}
          href="/admin/festivals"
          color="bg-brand-yellow/10 text-brand-yellow"
        />
        <StatCard
          title="Producers"
          value={totalProducers}
          icon={Users}
          href="/admin/producers"
          color="bg-purple-100 text-purple-700"
        />
        <StatCard
          title="Pending Review"
          value={pendingFestivals}
          icon={Clock}
          href="/admin/pending"
          color="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          title="Approved"
          value={approvedFestivals}
          icon={CheckCircle}
          href="/admin/festivals"
          color="bg-green-100 text-green-700"
        />
        <StatCard
          title="Rejected"
          value={rejectedFestivals}
          icon={AlertCircle}
          color="bg-red-100 text-red-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Producers at a Glance
            </CardTitle>
            <Link
              href="/admin/producers"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All
              <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {producers.length === 0 ? (
              <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
                No producers yet.
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
                    </tr>
                  </thead>
                  <tbody>
                    {producers.slice(0, 5).map((producer) => (
                      <tr
                        key={producer.id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-6 py-3 font-medium">
                          {producer.name || "—"}
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">
                          {producer.email}
                        </td>
                        <td className="px-6 py-3 text-center font-medium">
                          {producer.festivalCount}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className="text-green-600">
                            {producer.approvedCount}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {producer.pendingCount > 0 ? (
                            <span className="text-yellow-600">
                              {producer.pendingCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground">
                          {producer.lastSubmission ? (
                            <RelativeTime date={producer.lastSubmission} />
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div
                    key={`${activity.type}-${activity.label}-${i}`}
                    className="flex items-start gap-3"
                  >
                    <ActivityIcon type={activity.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight">
                        <ActivityText activity={activity} />
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <RelativeTime date={activity.timestamp} />
                        {activity.user && ` · ${activity.user}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-4 text-muted-foreground" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  <Eye className="size-4" />
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

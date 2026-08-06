import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { STATUS_COLORS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Database,
  Share2,
  BookOpen,
  Settings,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Activity
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();

  // Fetch all counts for the landing hub metrics
  const [
    pendingReviews,
    quarantinedRows,
    unmoderatedPosts,
    activeFestivals,
    totalFestivals
  ] = await Promise.all([
    prisma.festival.count({ where: { workflow_state: "pending_review" } }),
    prisma.festivalImportRow.count({ where: { disposition: "quarantined" } }),
    prisma.socialPost.count({ where: { moderation_status: "pending" } }),
    prisma.festival.count({ where: { workflow_state: "published" } }),
    prisma.festival.count()
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

  const displayName = session.user.name ?? session.user.email;

  const stateBadgeClasses = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    pending_review: "bg-amber-100 text-amber-800 border-amber-200",
    changes_requested: "bg-purple-100 text-purple-800 border-purple-200",
    approved: "bg-blue-100 text-blue-800 border-blue-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
    published: "bg-green-100 text-green-800 border-green-200",
    unpublished: "bg-zinc-100 text-zinc-700 border-zinc-200",
    canceled: "bg-rose-100 text-rose-800 border-rose-200",
    archived: "bg-slate-100 text-slate-500 border-slate-200",
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Admin Control Panel</span>
        <h1 className="text-3xl font-heading font-bold text-slate-900 mt-1">
          Welcome back, {displayName}
        </h1>
        <p className="text-slate-500 text-sm mt-1.5">
          Centralized administrative hub for Philly Festivals content, ingestion, and social moderation.
        </p>
      </div>

      {/* Grid of micro-stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Reviews
            </span>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{pendingReviews}</div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting editorial actions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Quarantined Imports
            </span>
            <Database className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{quarantinedRows}</div>
            <p className="text-[11px] text-slate-500 mt-1">Rows flagged for validation issues</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Social Posts
            </span>
            <Share2 className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{unmoderatedPosts}</div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting feed moderation</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Festivals
            </span>
            <Activity className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeFestivals}</div>
            <p className="text-[11px] text-slate-500 mt-1">Currently live on the site</p>
          </CardContent>
        </Card>

      </div>

      {/* Main workspace cards */}
      <div>
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Administrative Workspaces</h2>
        
        <div className="grid gap-6 md:grid-cols-3">
          
          <Card className="shadow-sm border-slate-200 bg-white hover:border-slate-400 transition-colors flex flex-col justify-between">
            <CardHeader>
              <div className="size-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3">
                <BookOpen className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-950">Editorial Workspace</CardTitle>
              <CardDescription className="text-sm text-slate-500 leading-normal">
                Review, edit, and approve producer-submitted festivals. Move records through publication states, draft to publish.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between mt-auto">
              <span className="text-xs font-semibold text-slate-500">
                {pendingReviews} reviews pending
              </span>
              <Link href="/admin/festivals" className={buttonVariants({ size: "sm", className: "font-semibold gap-1" })}>
                Open <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-white hover:border-slate-400 transition-colors flex flex-col justify-between">
            <CardHeader>
              <div className="size-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3">
                <Database className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-950">CSV Ingestion Workspace</CardTitle>
              <CardDescription className="text-sm text-slate-500 leading-normal">
                Inspect automated batch uploads, review duplicate mapping conflicts, and triage validation issues on quarantined CSV rows.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between mt-auto">
              <span className="text-xs font-semibold text-slate-500">
                {quarantinedRows} quarantined rows
              </span>
              <Link href="/admin/imports" className={buttonVariants({ size: "sm", className: "font-semibold gap-1" })}>
                Open <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200 bg-white hover:border-slate-400 transition-colors flex flex-col justify-between">
            <CardHeader>
              <div className="size-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-3">
                <Share2 className="size-5" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-950">Social Moderation Hub</CardTitle>
              <CardDescription className="text-sm text-slate-500 leading-normal">
                Audit social feed synchronization logs and moderate posts pulled from linked platforms for published festivals.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between mt-auto">
              <span className="text-xs font-semibold text-slate-500">
                {unmoderatedPosts} posts pending review
              </span>
              <Link href="/admin/festivals?state=published" className={buttonVariants({ size: "sm", className: "font-semibold gap-1" })}>
                Open <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Recent submissions and metadata */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Recent submissions Card */}
        <Card className="md:col-span-2 shadow-sm border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {recentFestivals.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No submissions yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentFestivals.map((f) => {
                  const stateClass = stateBadgeClasses[f.workflow_state] || "bg-slate-100 text-slate-600";
                  return (
                    <div key={f.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="space-y-0.5">
                        <Link href={`/admin/festivals/${f.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors hover:underline">
                          {f.name}
                        </Link>
                        <div className="text-xs text-slate-400">
                          Received: {new Date(f.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge className={`font-semibold border text-xs ${stateClass}`} variant="outline">
                        {f.workflow_state.replaceAll("_", " ")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Global Settings & Quick Actions */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-2.5">
            <Link href="/admin/festivals" className={buttonVariants({ variant: "outline", className: "w-full justify-between font-semibold" })}>
              <span className="flex items-center gap-2">
                <Calendar className="size-4 text-slate-500" />
                View All Festivals
              </span>
              <ChevronRight className="size-4 text-slate-400" />
            </Link>
            
            <Link href="/admin/settings" className={buttonVariants({ variant: "outline", className: "w-full justify-between font-semibold" })}>
              <span className="flex items-center gap-2">
                <Settings className="size-4 text-slate-500" />
                System Settings
              </span>
              <ChevronRight className="size-4 text-slate-400" />
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

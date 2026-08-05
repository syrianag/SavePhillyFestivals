import { notFound } from "next/navigation";
import AdminFestivalDetail from "@/features/editorial-workflow/AdminFestivalDetail";
import { editorialRepository } from "@/features/editorial-workflow/editorial-repository";
import { editorialE2ERepository } from "@/features/editorial-workflow/editorial-e2e-fixture";
import { validTransitions } from "@/features/editorial-workflow/editorial-transition-policy";
import AdminSocialFeedManager from "@/features/social-feed/AdminSocialFeedManager";
import { socialFeedE2ERepository } from "@/features/social-feed/social-feed-e2e-fixture";
import { socialFeedRepository } from "@/features/social-feed/social-feed-repository";
import { requireAdmin } from "@/lib/auth-helpers";

export default async function AdminFestivalDetailPage({ params }) {
  await requireAdmin();
  const festival = await (editorialE2ERepository() || editorialRepository).findDetail((await params).id);
  if (!festival) notFound();
  const socialRepository = socialFeedE2ERepository() || socialFeedRepository;
  const socialFeed = await socialRepository.findFeedForAdmin(festival.id);
  const socialResult = socialFeed
    ? await socialRepository.listPosts(festival.id, { status: "pending", page: 1, limit: 24 })
    : { posts: [], pagination: { page: 1, limit: 24, total: 0, pages: 0 } };
  return <div className="space-y-10">
    <AdminFestivalDetail initialFestival={{ ...festival, valid_actions: validTransitions(festival.workflow_state) }} />
    <AdminSocialFeedManager festivalId={festival.id} initialFeed={socialFeed} initialPosts={socialResult.posts} initialPagination={socialResult.pagination} />
  </div>;
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { PUBLICATION_STATES } from "./publication-policy";
import { Calendar, User, Eye, History } from "lucide-react";

const stateBadgeMap = {
  draft: { variant: "outline", className: "bg-slate-50 text-slate-700 border-slate-200", label: "Draft" },
  pending_review: { variant: "default", className: "bg-amber-500 text-white hover:bg-amber-600", label: "Pending Review" },
  changes_requested: { variant: "secondary", className: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200", label: "Changes Requested" },
  approved: { variant: "secondary", className: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200", label: "Approved" },
  rejected: { variant: "destructive", className: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200", label: "Rejected" },
  published: { variant: "default", className: "bg-green-600 text-white hover:bg-green-700", label: "Published" },
  unpublished: { variant: "outline", className: "bg-zinc-100 text-zinc-700 border-zinc-200", label: "Unpublished" },
  canceled: { variant: "destructive", className: "bg-rose-500 text-white hover:bg-rose-600", label: "Canceled" },
  archived: { variant: "outline", className: "bg-slate-100 text-slate-500 border-slate-200", label: "Archived" },
};

/* Every active filter has to survive a state-pill click and a page change, or paginating past
 * page one silently discards the search the editor just typed. */
function pageHref(state, page, filters = {}) {
  const params = new URLSearchParams();
  if (state) params.set("state", state);
  if (filters.q) params.set("q", filters.q);
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.featured) params.set("featured", "1");
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/festivals${query ? `?${query}` : ""}`;
}

export default function AdminFestivalList({ festivals, selectedState, pagination, activeFilters = {}, counts = {}, totalCount = 0 }) {
  const hasFilters = Boolean(activeFilters.q || activeFilters.start || activeFilters.end || activeFilters.featured);
  return (
    <div className="space-y-6">
      {/* Plain GET form: the results are server-rendered, so the URL stays the single source of
        * truth for what the editor is looking at and the view is shareable. */}
      <form method="get" action="/admin/festivals" className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        {selectedState && <input type="hidden" name="state" value={selectedState} />}
        <div className="min-w-52 flex-1">
          <label htmlFor="admin-festival-search" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
            Search name or location
          </label>
          <input
            id="admin-festival-search"
            name="q"
            type="search"
            defaultValue={activeFilters.q}
            maxLength={120}
            className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
        <div>
          <label htmlFor="admin-festival-start" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">From</label>
          <input id="admin-festival-start" name="start" type="date" defaultValue={activeFilters.start}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
        </div>
        <div>
          <label htmlFor="admin-festival-end" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">To</label>
          <input id="admin-festival-end" name="end" type="date" defaultValue={activeFilters.end}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input id="admin-festival-featured" name="featured" type="checkbox" value="1" defaultChecked={activeFilters.featured} className="size-4 rounded border-slate-300" />
          <label htmlFor="admin-festival-featured" className="text-sm text-slate-700">Featured only</label>
        </div>
        <Button type="submit" size="sm">Apply</Button>
        {hasFilters && (
          <Link href={pageHref(selectedState, 1)} className="pb-2 text-sm font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800">
            Clear filters
          </Link>
        )}
      </form>

      {/* State Filters */}
      <nav aria-label="Festival state filters" className="flex flex-wrap gap-2 items-center">
        <Link 
          className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
            !selectedState 
              ? "bg-slate-900 border-slate-900 text-white" 
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`} 
          href={pageHref(null, 1, activeFilters)}
        >
          All <span className="ml-1 opacity-70">({totalCount})</span>
        </Link>
        {PUBLICATION_STATES.map((state) => {
          const count = counts[state] || 0;
          const config = stateBadgeMap[state] || { label: state };
          const isSelected = selectedState === state;
          return (
            <Link 
              key={state} 
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                isSelected 
                  ? "bg-slate-900 border-slate-900 text-white" 
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`} 
              href={pageHref(state, 1, activeFilters)}
            >
              {config.label} <span className="ml-1 opacity-70">({count})</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Queue Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-6">Festival Details</th>
                <th className="p-4">State</th>
                <th className="p-4">Revision</th>
                <th className="p-4">Last Updated</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {festivals.length ? (
                festivals.map((festival) => {
                  const badgeConfig = stateBadgeMap[festival.workflow_state] || { variant: "outline", label: festival.workflow_state };
                  return (
                    <tr key={festival.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="font-heading text-base font-bold text-slate-950">
                          {festival.name || "Untitled Festival"}
                        </div>
                        {festival.location && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <span className="font-medium">{festival.location}</span>
                            {festival.city && <span>· {festival.city}</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={badgeConfig.variant} 
                          className={`font-semibold border ${badgeConfig.className}`}
                        >
                          {badgeConfig.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <History className="size-3.5 text-slate-400" />
                          Rev {festival.revision}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-slate-400" />
                          {new Date(festival.updated_at).toLocaleDateString()} at{" "}
                          {new Date(festival.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <Link 
                          href={`/admin/festivals/${festival.id}`} 
                          className={buttonVariants({ variant: "outline", size: "sm", className: "font-semibold shadow-xs hover:border-slate-400" })}
                        >
                          <Eye className="size-3.5 mr-1" />
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="p-12 text-center text-slate-500" colSpan={5}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="text-lg font-semibold text-slate-700">No festivals match this queue</div>
                      <p className="text-sm max-w-sm">There are no submissions currently under the &ldquo;{selectedState ? selectedState.replaceAll("_", " ") : "All"}&rdquo; state filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <nav aria-label="Festival result pages" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">
            Showing Page <span className="font-semibold text-slate-800">{pagination.page}</span> of <span className="font-semibold text-slate-800">{pagination.pages}</span> ({pagination.total} total items)
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href={pageHref(selectedState, pagination.page - 1, activeFilters)} 
              className={`rounded-lg border px-4 py-1.5 font-ui text-sm font-semibold transition-colors ${
                pagination.page <= 1 
                  ? "pointer-events-none opacity-40 bg-slate-50 text-slate-400 border-slate-200" 
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Previous
            </Link>
            <Link 
              href={pageHref(selectedState, pagination.page + 1, activeFilters)} 
              className={`rounded-lg border px-4 py-1.5 font-ui text-sm font-semibold transition-colors ${
                pagination.page >= pagination.pages 
                  ? "pointer-events-none opacity-40 bg-slate-50 text-slate-400 border-slate-200" 
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Next
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}


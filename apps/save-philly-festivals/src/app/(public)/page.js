import { Suspense } from "react";
import Link from "next/link";
import { DiscoveryControls } from "@/components/shared/DiscoveryControls";
import { FeaturedFestivalCard } from "@/components/shared/FeaturedFestivalCard";
import { formatFestivalDate, hasActiveDiscoveryFilters, parseDiscoveryParams } from "@/features/festivals/discovery";
import { getDiscoveryFacets, getFeaturedFestivals } from "@/features/festivals/public-discovery";
import { FestivalResults, FestivalResultsSkeleton } from "@/features/festivals/FestivalResults";
import { articles } from "@/lib/festivals";

const CARD_COLORS = ["#1E7BF6", "#206C4E", "#F6C847", "#FE7D0C", "#FF8577", "#FB439B"];

function displayLocation(festival) {
  return festival.location || festival.city || "Philadelphia";
}

export default async function Home({ searchParams }) {
  const filters = parseDiscoveryParams(await searchParams);

  /* Only the page shell's own data is awaited here. The result grid loads inside a Suspense
   * boundary below, so paginating re-renders the list without tearing down the hero, the search
   * controls, or the featured row. */
  let facets = { categories: [], locations: [] };
  /* Editor-curated promotions; `getFeaturedFestivals` falls back to the soonest upcoming
   * festivals when nothing is flagged, so the row is never empty. */
  let featured = [];

  /* The featured row ignores the active query by design — it is editorial, not a result set.
   * That made search look broken: searching "Caribbean" still showed a promoted art walk above
   * the results, and a search with no matches still showed two unrelated festivals next to
   * "No festivals match your search". Once the visitor is filtering, the page should answer the
   * question they asked, so the row is suppressed until they clear the filters. */
  const isBrowsingUnfiltered = !hasActiveDiscoveryFilters(filters);

  try {
    [facets, featured] = await Promise.all([
      getDiscoveryFacets(),
      isBrowsingUnfiltered ? getFeaturedFestivals(2) : [],
    ]);
  } catch (error) {
    console.error("Homepage shell data failed to load", error);
  }

  return (
    <>
      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-8 md:px-[81px] md:pb-10 md:pt-12">
        {/* Modern Glassmorphic Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/60 via-slate-50/50 to-rose-50/50 border border-slate-200/50 p-6 sm:p-10 md:p-14 shadow-2xs mb-8">
          {/* Decorative radial gradients for premium depth */}
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />
          <div className="absolute right-10 bottom-0 size-96 rounded-full bg-rose-200/15 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-500/20 mb-5 shadow-2xs">
              ✨ Celebrating Community & Culture
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-slate-900 mb-5">
              Discover Philadelphia&apos;s <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-500 bg-clip-text text-transparent">Vibrant Festivals</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mb-8 mx-auto max-w-2xl font-sans leading-relaxed">
              From summer block parties and art walks to cultural celebrations, explore the events that make every Philly neighborhood unique.
            </p>
            
            {/* Controls stay left-aligned internally — centered form fields are hard to
              * scan — but the block itself centers under the heading. */}
            <div className="mx-auto max-w-[960px] text-left">
              <DiscoveryControls filters={filters} categories={facets.categories} locations={facets.locations} />
            </div>
          </div>
        </div>

        {/* Discovery view switcher tabs */}
        <nav aria-label="Discovery views" className="mt-8 flex items-center justify-center gap-4 border-b border-slate-200 pb-3">
          <button 
            type="button" 
            aria-current="page" 
            className="flex items-center gap-2 border-b-2 border-slate-900 pb-2.5 font-ui text-sm font-bold text-slate-900 md:text-base transition-colors"
          >
            Featured
          </button>
          <Link
            href="/map"
            className="flex items-center gap-2 pb-2.5 font-ui text-sm font-semibold text-slate-500 hover:text-slate-900 md:text-base transition-colors"
          >
            Map
          </Link>
          <Link 
            href="/calendar" 
            className="flex items-center gap-2 pb-2.5 font-ui text-sm font-semibold text-slate-500 hover:text-slate-900 md:text-base transition-colors"
          >
            Calendar
          </Link>
        </nav>
      </section>

      {featured.length > 0 && (
        <section aria-label="Featured festival results" className="pb-10">
          {/* A grid rather than a scroll row. The cards were `w-[min(896px,85vw)]` with
            * `flex-shrink-0`, so two of them needed ~170vw and could never fit any viewport —
            * the row was permanently horizontally scrolled at every screen size. */}
          <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 pb-6 md:grid-cols-2 md:gap-[38px] md:px-[81px]">
            {featured.map((festival, index) => (
              <FeaturedFestivalCard
                key={festival.id}
                slug={festival.slug}
                title={festival.name}
                date={formatFestivalDate(festival.start_date, festival.end_date)}
                location={displayLocation(festival)}
                description={festival.description}
                bgColor={CARD_COLORS[index % CARD_COLORS.length]}
                badge="Featured"
                isLight={false}
                image={festival.image_url}
              />
            ))}
          </div>
        </section>
      )}

      {/* About Philly Fests Section */}
      <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-[81px] md:py-14">
        <div className="mx-auto max-w-4xl text-center bg-slate-50/50 border border-slate-100 rounded-3xl p-6 sm:p-10 md:p-12">
          <h2 className="font-heading text-3xl font-extrabold leading-tight text-slate-900 md:text-[38px]">
            About Philly Fests
          </h2>
          <p className="mt-4 font-serif text-lg sm:text-xl leading-relaxed text-slate-600 md:mt-6 md:text-[24px] md:leading-[32px]">
            We&apos;re grateful for the support of our incredible community partners who make these festivals possible. Every neighborhood in Philadelphia has its own rhythm — summer block parties, cultural festivals, art walks, food fairs. Philly Festivals brings these celebrations together in one place.
          </p>
        </div>
      </section>

      {/* Discover Grid Section */}
      <section id="festival-results" aria-labelledby="festival-results-heading" className="mx-auto max-w-[1440px] scroll-mt-6 px-4 pb-8 md:px-[81px]">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 id="festival-results-heading" className="font-heading text-xl font-bold text-slate-900 md:text-2xl">
            {filters.category ? `${filters.category} festivals` : "Discover festivals"}
          </h2>
        </div>

        {/* Only this subtree re-renders while paginating; `key` re-suspends it per query so the
          * skeleton appears for the new page instead of the previous results lingering. */}
        <Suspense key={JSON.stringify(filters)} fallback={<FestivalResultsSkeleton />}>
          <FestivalResults filters={filters} />
        </Suspense>
      </section>

      {/* Tours Promotion Banner */}
      <section className="mx-auto max-w-[1440px] px-4 pb-10 md:px-[81px] md:pb-14">
        <div className="flex flex-col overflow-hidden rounded-3xl bg-indigo-600 md:flex-row md:items-center shadow-md">
          <div className="w-full shrink-0 px-6 py-8 sm:px-10 md:w-[480px] md:px-12 md:py-12">
            <p className="font-serif text-2xl leading-normal text-amber-300 md:text-[28px] md:leading-[36px]">
              Explore hidden gems and local favorites with our trusted guided tours!
            </p>
            <div className="mt-6">
              <Link 
                href="/tours" 
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 font-ui text-sm font-bold text-indigo-700 transition-all hover:bg-slate-50 shadow-xs"
              >
                Learn More
              </Link>
            </div>
          </div>
          <div 
            className="h-[140px] flex-1 bg-cover bg-center md:h-[220px]" 
            style={{ 
              backgroundImage: 'linear-gradient(to right, rgba(79, 70, 229, 0.4), rgba(79, 70, 229, 0.2)), url("https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=800")' 
            }}
          />
        </div>
      </section>

      {/* Community Articles Grid */}
      <section className="mx-auto max-w-[1440px] px-4 pb-12 md:px-[81px] md:pb-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {articles.map((article) => (
            <div 
              key={article.id} 
              className="flex items-center gap-4 overflow-hidden rounded-2xl p-5 border border-slate-100 shadow-2xs hover:shadow-xs transition-all duration-300 bg-white" 
            >
              <div 
                className="h-[80px] w-[80px] shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${article.bgColor}22, ${article.bgColor}44)` 
                }}
              >
                <span className="text-2xl font-bold" style={{ color: article.textColor }}>
                  {article.title.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold leading-tight text-slate-800">
                  {article.title}
                </h3>
                <p className="mt-1 font-body text-xs leading-relaxed text-slate-500">
                  {article.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

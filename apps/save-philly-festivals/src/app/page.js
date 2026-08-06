import Link from "next/link";
import { DiscoveryControls } from "@/components/shared/DiscoveryControls";
import { FeaturedFestivalCard } from "@/components/shared/FeaturedFestivalCard";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { formatFestivalDate, parseDiscoveryParams } from "@/features/festivals/discovery";
import { discoverApprovedFestivals } from "@/features/festivals/public-discovery";
import { articles } from "@/lib/festivals";

const CARD_COLORS = ["#1E7BF6", "#206C4E", "#F6C847", "#FE7D0C", "#FF8577", "#FB439B"];

function pageHref(filters, page) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, page })) {
    if (value && !(key === "sort" && value === (filters.q ? "relevance" : "soonest"))) {
      params.set(key, String(value));
    }
  }
  return `/?${params.toString()}#festival-results`;
}

function displayLocation(festival) {
  return festival.location || festival.city || "Philadelphia";
}

export default async function Home({ searchParams }) {
  const filters = parseDiscoveryParams(await searchParams);
  let discovery;
  let databaseFailed = false;

  try {
    discovery = await discoverApprovedFestivals(filters);
  } catch (error) {
    databaseFailed = true;
    console.error("Public festival discovery failed", error);
    discovery = {
      items: [],
      pagination: { page: 1, pageSize: 24, total: 0, pages: 1, offset: 0 },
      categories: [],
      locations: [],
    };
  }

  const featured = discovery.items.slice(0, 2);
  const resultLabel = `${discovery.pagination.total} ${discovery.pagination.total === 1 ? "festival" : "festivals"} found`;

  return (
    <>
      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-8 md:px-[81px] md:pb-10 md:pt-12">
        {/* Modern Glassmorphic Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/60 via-slate-50/50 to-rose-50/50 border border-slate-200/50 p-6 sm:p-10 md:p-14 shadow-2xs mb-8">
          {/* Decorative radial gradients for premium depth */}
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />
          <div className="absolute right-10 bottom-0 size-96 rounded-full bg-rose-200/15 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-4xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-500/20 mb-5 shadow-3xs">
              ✨ Celebrating Community & Culture
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-slate-900 mb-5">
              Discover Philadelphia&apos;s <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-500 bg-clip-text text-transparent">Vibrant Festivals</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mb-8 max-w-2xl font-sans leading-relaxed">
              From summer block parties and art walks to cultural celebrations, explore the events that make every Philly neighborhood unique.
            </p>
            
            <div className="max-w-[960px] text-left">
              <DiscoveryControls filters={filters} categories={discovery.categories} locations={discovery.locations} />
            </div>
          </div>
        </div>

        {/* Discovery view switcher tabs */}
        <nav aria-label="Discovery views" className="mt-8 flex items-center gap-4 border-b border-slate-200 pb-3">
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
        <section aria-label="Featured festival results" className="overflow-hidden pb-10">
          <div className="flex gap-5 overflow-x-auto px-4 pb-6 md:gap-[38px] md:pl-[81px] md:pr-[81px]">
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
          <div aria-hidden="true" className="mt-2 hidden items-center justify-end gap-2 px-4 md:flex md:px-[81px]">
            <span className="size-[8px] rounded-full bg-slate-900" />
            <span className="size-[8px] rounded-full bg-slate-200" />
            <span className="size-[8px] rounded-full bg-slate-200" />
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
          <p aria-live="polite" className="font-ui text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {databaseFailed ? "Results unavailable" : resultLabel}
          </p>
        </div>

        {databaseFailed ? (
          <div role="alert" className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <h3 className="font-heading text-2xl font-bold text-slate-800">Festival listings are temporarily unavailable</h3>
            <p className="mx-auto mt-2 max-w-xl font-body text-slate-500">We couldn&apos;t load approved festivals right now. Please try again shortly.</p>
          </div>
        ) : discovery.items.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-100 px-6 py-12 text-center">
            <h3 className="font-heading text-2xl font-bold text-slate-800">No festivals match your search</h3>
            <p className="mx-auto mt-2 max-w-xl font-body text-slate-500">Try a different keyword, date range, category, or location.</p>
            <Link 
              href="/" 
              className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-6 font-ui text-sm font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
            >
              Clear all filters
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {discovery.items.map((festival, index) => (
              <FestivalCard
                key={festival.id}
                variant="compact"
                id={festival.id}
                slug={festival.slug}
                image={festival.image_url}
                title={festival.name}
                date={formatFestivalDate(festival.start_date, festival.end_date)}
                location={displayLocation(festival)}
                category={festival.categories?.[0]?.category?.name}
                bgColor={CARD_COLORS[index % CARD_COLORS.length]}
              />
            ))}
          </div>
        )}

        {/* Custom Modern Pagination */}
        {!databaseFailed && discovery.pagination.pages > 1 && (
          <nav aria-label="Festival result pages" className="mt-12 flex items-center justify-center gap-3 border-t border-slate-100 pt-8">
            {discovery.pagination.page > 1 && (
              <Link 
                href={pageHref(filters, discovery.pagination.page - 1)} 
                className="rounded-full border border-slate-350 px-4 py-2 font-ui text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="font-ui text-sm font-bold text-slate-500">
              Page {discovery.pagination.page} of {discovery.pagination.pages}
            </span>
            {discovery.pagination.page < discovery.pagination.pages && (
              <Link 
                href={pageHref(filters, discovery.pagination.page + 1)} 
                className="rounded-full bg-slate-900 px-5 py-2 font-ui text-sm font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
              >
                Next
              </Link>
            )}
          </nav>
        )}
      </section>

      {/* Tours Promotion Banner */}
      <section className="mx-auto max-w-[1440px] px-4 pb-10 md:px-[81px] md:pb-14">
        <div className="flex flex-col overflow-hidden rounded-3xl bg-indigo-650 md:flex-row md:items-center shadow-md">
          <div className="w-full shrink-0 px-6 py-8 sm:px-10 md:w-[480px] md:px-12 md:py-12">
            <p className="font-serif text-2xl leading-normal text-amber-300 md:text-[28px] md:leading-[36px]">
              Explore hidden gems and local favorites with our trusted guided tours!
            </p>
            <div className="mt-6">
              <Link 
                href="/tours" 
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 font-ui text-sm font-bold text-indigo-750 transition-all hover:bg-slate-50 shadow-xs"
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

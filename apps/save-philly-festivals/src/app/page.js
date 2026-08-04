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
      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-12 md:px-[81px] md:pb-12 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mt-8 max-w-[960px] text-left">
            <DiscoveryControls filters={filters} categories={discovery.categories} locations={discovery.locations} />
          </div>
        </div>

        <nav aria-label="Discovery views" className="mt-10 flex items-center gap-3 border-b border-[#848484] pb-6 md:mt-[83px] md:pb-[59px]">
          <button type="button" aria-current="page" className="flex items-center gap-3 border-b-4 border-black pb-2 font-ui text-sm font-medium text-black md:text-base">Featured</button>
          <span aria-disabled="true" className="flex items-center gap-3 pb-2 font-ui text-sm font-medium text-[#606060] md:text-base">Map</span>
          <Link href="/calendar" className="flex items-center gap-3 pb-2 font-ui text-sm font-medium text-black md:text-base">Calendar</Link>
        </nav>
      </section>

      {featured.length > 0 && (
        <section aria-label="Featured festival results" className="overflow-hidden pb-12">
          <div className="flex gap-4 overflow-x-auto px-4 pb-4 md:gap-[38px] md:pl-[81px] md:pr-[81px]">
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
              />
            ))}
          </div>
          <div aria-hidden="true" className="mt-4 hidden items-center justify-end gap-[6px] px-4 md:flex md:px-[81px]">
            <span className="size-[9px] rounded-full bg-[#3D3D3D]" />
            <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
            <span className="size-[9px] rounded-full bg-[#D9D9D9]" />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-[81px] md:py-16">
        <div className="mx-auto max-w-[892px] text-center">
          <h2 className="font-heading text-3xl font-bold leading-tight text-black md:text-[40px] md:leading-[47px]">About Philly Fests</h2>
          <p className="mt-4 font-serif text-xl leading-snug text-[#45556C] md:mt-6 md:text-[28px] md:leading-[34px]">
            We&apos;re grateful for the support of our incredible community partners who make these festivals possible. Every neighborhood in Philadelphia has its own rhythm — summer block parties, cultural festivals, art walks, food fairs. Philly Festivals brings these celebrations together in one place.
          </p>
        </div>
      </section>

      <section id="festival-results" aria-labelledby="festival-results-heading" className="mx-auto max-w-[1440px] scroll-mt-6 px-4 pb-8 md:px-[81px]">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="festival-results-heading" className="font-body text-lg font-normal text-black">
            {filters.category ? `${filters.category} festivals` : "Discover festivals"}
          </h2>
          <p aria-live="polite" className="font-body text-sm font-semibold text-[#606060]">{databaseFailed ? "Results unavailable" : resultLabel}</p>
        </div>

        {databaseFailed ? (
          <div role="alert" className="mt-6 rounded-xl border border-[#AEAEAE] bg-[#F7F7F7] px-6 py-10 text-center">
            <h3 className="font-heading text-2xl font-bold text-black">Festival listings are temporarily unavailable</h3>
            <p className="mx-auto mt-2 max-w-xl font-body text-[#606060]">We couldn&apos;t load approved festivals right now. Please try again shortly.</p>
          </div>
        ) : discovery.items.length === 0 ? (
          <div className="mt-6 rounded-xl bg-[#F7F7F7] px-6 py-10 text-center">
            <h3 className="font-heading text-2xl font-bold text-black">No festivals match your search</h3>
            <p className="mx-auto mt-2 max-w-xl font-body text-[#606060]">Try a different keyword, date range, category, or location.</p>
            <Link href="/" className="mt-5 inline-flex h-9 items-center rounded-full bg-[#424242] px-5 font-ui text-sm font-medium text-white">Clear all filters</Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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

        {!databaseFailed && discovery.pagination.pages > 1 && (
          <nav aria-label="Festival result pages" className="mt-10 flex items-center justify-center gap-3">
            {discovery.pagination.page > 1 && <Link href={pageHref(filters, discovery.pagination.page - 1)} className="rounded-full border border-[#424242] px-4 py-2 font-ui text-sm font-medium">Previous</Link>}
            <span className="font-ui text-sm text-[#606060]">Page {discovery.pagination.page} of {discovery.pagination.pages}</span>
            {discovery.pagination.page < discovery.pagination.pages && <Link href={pageHref(filters, discovery.pagination.page + 1)} className="rounded-full bg-[#424242] px-4 py-2 font-ui text-sm font-medium text-white">Next</Link>}
          </nav>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-12 md:px-[81px] md:pb-16">
        <div className="flex flex-col overflow-hidden rounded-2xl bg-[#1E7BF6] md:flex-row md:items-center">
          <div className="w-full shrink-0 px-4 py-6 md:w-[439px] md:px-[21px] md:py-9"><p className="font-serif text-xl leading-snug text-[#F6C847] md:text-[28px] md:leading-[34px]">Explore hidden gems and local favorites with our trusted guided tours!</p></div>
          <div className="h-[120px] flex-1 bg-gradient-to-br from-gray-200 to-gray-300 md:h-[195px]" />
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-12 md:px-[81px] md:pb-16">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-10">
          {articles.map((article) => (
            <div key={article.id} className="flex items-center gap-[10px] overflow-hidden rounded-[20px] px-[17px] py-[18px]" style={{ backgroundColor: article.bgColor }}>
              <div className="h-[79px] w-[76px] shrink-0 rounded-[20px] bg-white" />
              <div><h3 className="font-body text-sm font-semibold leading-[17px]" style={{ color: article.textColor }}>{article.title}</h3><p className="mt-2 font-body text-xs leading-[14px]" style={{ color: article.textColor }}>{article.description}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

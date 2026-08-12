import { FestivalCard } from "@/components/shared/FestivalCard";
import { formatFestivalDate } from "@/features/festivals/discovery";
import { getRecentlyEndedFestivals, RECENTLY_ENDED_WINDOW_DAYS } from "@/features/festivals/public-discovery";
import { ourFestivalsRepository } from "@/features/our-festivals/our-festivals-repository";
import { publicOurFestivalItems } from "@/features/our-festivals/our-festivals-service";
import OurFestivalsGallery from "@/features/our-festivals/OurFestivalsGallery";

const CARD_COLORS = ["#1E7BF6", "#206C4E", "#F6C847", "#FE7D0C", "#FF8577", "#FB439B"];

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Our Festivals | Philly Festivals",
  description: "A look back at the festivals Philadelphia has celebrated over the last three months.",
};

function displayLocation(festival) {
  return festival.location || festival.city || "Philadelphia";
}

export default async function OurFestivalsPage() {
  /* Two independent sources, each degrading to empty rather than taking the page down: the
   * retrospective is the point of the page, and curated imagery is an optional layer on top. */
  let recent = [];
  let curated = [];
  try {
    [recent, curated] = await Promise.all([
      getRecentlyEndedFestivals(),
      publicOurFestivalItems({ repository: ourFestivalsRepository }).catch(() => []),
    ]);
  } catch (error) {
    console.error("Our Festivals page data failed to load", error);
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-[81px] md:py-14">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
          Our Festivals
        </h1>
        <p className="mt-4 font-serif text-lg leading-relaxed text-slate-600 md:text-xl">
          A look back at the celebrations Philadelphia has hosted over the last{" "}
          {RECENTLY_ENDED_WINDOW_DAYS} days.
        </p>
      </header>

      {/* Curated imagery, when the team has added any. Hidden entirely rather than rendering an
        * empty band, so the page leads with real festivals on a fresh install. */}
      {curated.length > 0 && (
        <section aria-labelledby="our-festivals-highlights" className="mb-14">
          <h2 id="our-festivals-highlights" className="mb-6 font-heading text-2xl font-bold text-slate-900">
            Highlights
          </h2>
          <OurFestivalsGallery items={curated} />
        </section>
      )}

      <section aria-labelledby="our-festivals-recent">
        <h2 id="our-festivals-recent" className="mb-6 font-heading text-2xl font-bold text-slate-900">
          Recently celebrated
        </h2>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-12 text-center">
            <h3 className="font-heading text-xl font-bold text-slate-800">
              No festivals have wrapped up in the last {RECENTLY_ENDED_WINDOW_DAYS} days
            </h3>
            <p className="mx-auto mt-2 max-w-xl font-body text-slate-500">
              As festivals finish, they will appear here automatically.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((festival, index) => (
              <li key={festival.id}>
                <FestivalCard
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

import { prisma } from "@/lib/db";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { FestivalCard } from "@/components/shared/FestivalCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapIcon, Sparkles } from "lucide-react";

async function getFestivals() {
  const festivals = await prisma.festival.findMany({
    where: { status: FESTIVAL_STATUS.APPROVED },
    orderBy: { start_date: "asc" },
    take: 8,
    include: {
      categories: { include: { category: true } },
    },
  });

  return festivals.map((festival) => ({
    id: festival.id,
    slug: festival.slug,
    title: festival.name,
    date: festival.start_date
      ? new Date(festival.start_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "TBD",
    location: festival.city || "Philadelphia",
    category: festival.categories[0]?.category?.name || "Festival",
    badge: null,
    image: festival.image_url,
  }));
}

export default async function Home() {
  const festivals = await getFestivals();

  return (
    <>
      <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-12 md:px-[81px] md:pb-12 md:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mt-8 max-w-[513px]">
            <SearchBar />
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex items-center gap-4 border-b border-border">
            <button className="flex items-center gap-2 border-b-2 border-foreground pb-3 font-body text-sm font-semibold text-foreground">
              <Sparkles className="size-4" />
              Featured
            </button>
            <button className="flex items-center gap-2 pb-3 font-body text-sm text-brand-text-gray transition-colors hover:text-foreground">
              <MapIcon className="size-4" />
              Map
            </button>
            <button className="flex items-center gap-2 pb-3 font-body text-sm text-brand-text-gray transition-colors hover:text-foreground">
              <CalendarDays className="size-4" />
              Calendar
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {festivals.length > 0 ? (
              festivals.map((festival) => (
                <FestivalCard
                  key={festival.id}
                  slug={festival.slug}
                  title={festival.title}
                  date={festival.date}
                  location={festival.location}
                  category={festival.category}
                  badge={festival.badge}
                  image={festival.image}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-muted-foreground">
                  No festivals yet. Be the first to{" "}
                  <a href="/producer/submit" className="text-primary hover:underline">
                    submit a festival
                  </a>
                  !
                </p>
              </div>
            )}
          </div>

          {festivals.length >= 8 && (
            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" className="rounded-full px-8">
                Load more festivals
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

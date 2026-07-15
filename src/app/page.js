import { FestivalCard } from "@/components/shared/FestivalCard";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapIcon, Sparkles } from "lucide-react";

const festivals = [
  {
    id: 1,
    title: "52nd Street Summer Block Party",
    date: "Dec 19, 2025",
    location: "West Philadelphia",
    category: "Music",
    badge: "Featured",
    image: null,
  },
  {
    id: 2,
    title: "Taste of Kensington",
    date: "Dec 20, 2025",
    location: "Kensington",
    category: "Food",
    badge: "Featured",
    image: null,
  },
  {
    id: 3,
    title: "Taste of Kensington",
    date: "Dec 21, 2025",
    location: "Kensington",
    category: "Food",
    badge: "Featured",
    image: null,
  },
  {
    id: 4,
    title: "Taste of Kensington",
    date: "Dec 22, 2025",
    location: "Kensington",
    category: "Caribbean",
    image: null,
  },
  {
    id: 5,
    title: "Community Mural Festival",
    date: "Jan 10, 2026",
    location: "North Philly",
    category: "Art",
    image: null,
  },
  {
    id: 6,
    title: "South Philly Sabor",
    date: "Jan 18, 2026",
    location: "South Philly",
    category: "Food",
    image: null,
  },
  {
    id: 7,
    title: "Dance at the Art Museum",
    date: "Jan 25, 2026",
    location: "Center City",
    category: "Cultural",
    image: null,
  },
  {
    id: 8,
    title: "Winter Farmers Market",
    date: "Feb 1, 2026",
    location: "West Philadelphia",
    category: "Community",
    badge: "Featured",
    image: null,
  },
];

export default function Home() {
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
            {festivals.map((festival) => (
              <FestivalCard
                key={festival.id}
                title={festival.title}
                date={festival.date}
                location={festival.location}
                category={festival.category}
                badge={festival.badge}
              />
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button variant="outline" size="lg" className="rounded-full px-8">
              Load more festivals
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

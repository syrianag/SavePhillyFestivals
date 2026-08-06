import { FestivalCard } from "@/components/shared/FestivalCard";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";

export function UpcomingThisMonth({ festivals }) {
  return (
    <section className="bg-muted py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
        <Reveal>
          <SectionHeading
            eyebrow="Coming Up"
            title="Upcoming this month"
            description="What's coming soon? Peek at the festivals on the horizon and start planning your next adventure."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-2 md:gap-10">
          {festivals.map((festival) => (
            <Reveal key={festival.id} className="h-full">
              <FestivalCard
                variant="compact"
                fill
                className="h-full"
                slug={festival.slug}
                title={festival.title}
                date={festival.date}
                location={festival.location}
                category={festival.category}
                badge={festival.badge}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

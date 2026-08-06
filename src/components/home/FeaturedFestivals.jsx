import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";
import { FeaturedFestivalCard } from "@/components/shared/FeaturedFestivalCard";

export function FeaturedFestivals({ festivals }) {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
        <Reveal>
          <SectionHeading
            eyebrow="Featured"
            title="Festivals happening now"
            description="From South Street block parties to Fairmount Park concerts — these are the celebrations lighting up Philadelphia this season."
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-[83px] md:grid-cols-2 md:gap-10">
          {festivals.map((f, i) => (
            <Reveal key={f.id} delay={i * 80} className="h-full">
              <FeaturedFestivalCard
                className="h-full"
                id={f.id}
                showSave
                title={f.title}
                date={f.date}
                location={f.location}
                description={f.description}
                slug={f.slug}
                bgColor={f.bgColor}
                badge={f.badge}
                isLight={f.bgColor === "#F6C847"}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

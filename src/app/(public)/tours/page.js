import Link from "next/link";
import { tours } from "@/lib/festivals";
import { CrossBlock, QuadrantBlock } from "@/components/shared/DecorativeBlocks";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/home/Reveal";
import { Button } from "@/components/ui/button";

export default function ToursPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute -left-16 top-32 h-52 w-52 rounded-full bg-primary opacity-10 blur-3xl" />
      <div className="absolute -right-16 top-1/2 h-56 w-56 rounded-full bg-brand-yellow opacity-20 blur-3xl" />
      <div className="absolute bottom-24 left-1/4 h-52 w-52 rounded-full bg-accent opacity-10 blur-3xl" />

      <div className="relative mx-auto max-w-[1440px] px-4 md:px-[81px]">
        {/* Hero */}
        <section className="grid grid-cols-1 items-stretch gap-6 py-12 md:grid-cols-2 md:py-16">
          <Reveal className="h-full">
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-border bg-muted md:h-full">
              <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
            </div>
          </Reveal>

          <Reveal delay={100} className="h-full">
            <div
              className="relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl md:h-full"
              style={{ backgroundColor: "#206C4E" }}
            >
              <div className="absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-24 left-24 size-24 opacity-40">
                <CrossBlock bgColor="#FF93F0" patternColor="#FB439B" />
              </div>
              <div className="absolute -left-10 bottom-4 size-24 opacity-40">
                <QuadrantBlock bgColor="#FF6602" patternColor="#F6C847" />
              </div>

              <div className="relative flex flex-col gap-3 p-6 md:p-10">
                <span className="mb-1 inline-block w-fit rounded-full bg-brand-yellow/25 px-4 py-1.5 font-ui text-sm font-semibold text-brand-yellow">
                  Tours
                </span>
                <h1 className="font-heading text-3xl font-bold leading-tight text-brand-yellow md:text-[40px] md:leading-[47px]">
                  City of Festivals Tours
                </h1>
                <p className="max-w-[552px] font-body text-base leading-[19px] text-white md:text-base">
                  Ride the streets of the City of Festivals to witness a memory lane of good times at the
                  Philly Festivals&nbsp;Tour.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Carousel dots */}
        <div className="flex items-center justify-end gap-[6px] py-4">
          <span className="size-[9px] rounded-full bg-foreground/70" />
          <span className="size-[9px] rounded-full bg-border" />
          <span className="size-[9px] rounded-full bg-border" />
          <span className="size-[9px] rounded-full bg-border" />
          <span className="size-[9px] rounded-full bg-border" />
        </div>

        {/* Intro */}
        <section className="flex flex-col gap-8 pb-8 md:flex-row md:pb-12 md:pt-8">
          <Reveal className="flex-1">
            <p className="max-w-[888px] font-serif text-xl leading-snug text-foreground md:text-[28px] md:leading-[34px]">
              See a diverse display of vibes, cuisine, music, dance, photos, videos, and stories from
              the neighbors and neighborhoods that host these special gatherings.
            </p>
          </Reveal>
          <Reveal delay={100} className="h-full shrink-0 md:w-[428px]">
            <div className="flex h-[380px] w-full items-center justify-center rounded-2xl border border-border bg-muted shadow-sm">
              <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
            </div>
          </Reveal>
        </section>

        {/* Body copy */}
        <Reveal>
          <section className="pb-8 md:pb-12">
            <p className="max-w-[888px] font-body text-base leading-[19px] text-muted-foreground">
              Philadelphia&apos;s festival culture lives in its neighborhoods—each one with its own
              flavors, sounds, and stories. Our guided tours take you through the communities that make
              these celebrations happen, connecting you to the people and places behind the music, food,
              and traditions that define our city. Whether you hop on a bus, lace up your sneakers, or
              explore at your own pace, you&apos;ll experience the block parties, cultural celebrations,
              and community gatherings that make Philly the City of Brotherly Love and Sisterly Affection.
            </p>
          </section>
        </Reveal>

        {/* Tour Options */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-4 md:px-[81px]">
            <Reveal>
              <SectionHeading
                eyebrow="Tours"
                title="Tour Options"
                description="Choose the pace that fits your style — on the bus, on foot, or at your own speed."
              />
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-6 md:mt-14 md:grid-cols-3 md:gap-6">
              {tours.map((tour, i) => (
                <Reveal key={tour.id} delay={i * 80} className="h-full">
                  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
                    <div className="flex h-52 items-center justify-center bg-muted">
                      <span className="font-ui text-sm text-muted-foreground">Add Photo</span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div
                        className="inline-flex w-fit items-center justify-center px-6 py-2"
                        style={{ backgroundColor: tour.pillColor, borderRadius: "23px" }}
                      >
                        <span className="font-heading text-[22px] font-medium leading-[26px] text-black">
                          {tour.type}
                        </span>
                      </div>
                      <p className="mt-4 flex-1 font-body text-base leading-[19px] text-muted-foreground">
                        {tour.description}
                      </p>
                      <Button
                        variant="outline"
                        className="mt-6 w-fit border-foreground bg-transparent font-body text-base font-bold text-foreground hover:bg-muted"
                        render={<Link href="/tours" />}
                      >
                        Book now ({tour.price})
                      </Button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import { ourFestivalsRepository } from "@/features/our-festivals/our-festivals-repository";
import { publicOurFestivalItems } from "@/features/our-festivals/our-festivals-service";
import OurFestivalsGallery from "@/features/our-festivals/OurFestivalsGallery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Our Festivals | Philly Festivals",
  description: "A curated look at the festivals that make Philadelphia's neighborhoods what they are.",
};

export default async function OurFestivalsPage() {
  /* A gallery failure degrades to the empty state rather than replacing the whole page with an
   * error boundary — the same posture the homepage takes for its shell data. */
  let items = [];
  try {
    items = await publicOurFestivalItems({ repository: ourFestivalsRepository });
  } catch (error) {
    console.error("Our Festivals gallery failed to load", error);
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 md:px-[81px] md:py-14">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
          Our Festivals
        </h1>
        <p className="mt-4 font-serif text-lg leading-relaxed text-slate-600 md:text-xl">
          A curated look at the celebrations that make every Philadelphia neighborhood unique.
        </p>
      </header>

      <OurFestivalsGallery items={items} />
    </section>
  );
}

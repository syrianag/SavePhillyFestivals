import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-16 md:py-24">
      <div className="absolute right-24 top-16 h-52 w-52 rounded-full bg-primary opacity-10 blur-3xl" />
      <div className="absolute left-10 top-44 h-44 w-44 rounded-full bg-brand-yellow opacity-20 blur-3xl" />
      <div className="absolute bottom-8 right-1/3 h-60 w-60 rounded-full bg-secondary opacity-10 blur-3xl" />
      <div className="absolute -left-8 bottom-16 h-44 w-44 rounded-full bg-accent opacity-10 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="animate-fade-in-up">
          <span className="mb-4 inline-block rounded-full bg-brand-yellow/25 px-4 py-1.5 font-ui text-sm font-semibold text-brand-dark">
            Celebrate Philadelphia
          </span>
          <h1 className="font-heading text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
            Discover the <span className="text-accent">Heart</span> of{" "}
            <span className="text-primary">Philly</span>
          </h1>
          <p className="mt-6 max-w-lg font-serif text-lg leading-relaxed text-muted-foreground md:text-xl">
            Experience 150+ festivals celebrating Philadelphia&apos;s vibrant
            culture, music, food, and community.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button className="px-6 py-6 text-base" render={<a href="#discover" />}>
              Explore Festivals
            </Button>
            <Button
              variant="outline"
              className="border-primary px-6 py-6 text-base text-primary hover:bg-primary/10"
              render={<a href="/about" />}
            >
              Learn More
            </Button>
          </div>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
            <div className="rounded-2xl border-l-4 border-primary bg-primary/10 p-4">
              <p className="font-heading text-2xl font-bold text-primary md:text-3xl">150+</p>
              <p className="mt-1 font-ui text-xs text-muted-foreground">
                Annual Festivals
              </p>
            </div>
            <div className="rounded-2xl border-l-4 border-brand-yellow bg-brand-yellow/20 p-4">
              <p className="font-heading text-2xl font-bold text-yellow-600 md:text-3xl">1M+</p>
              <p className="mt-1 font-ui text-xs text-muted-foreground">
                Festival Goers
              </p>
            </div>
            <div className="rounded-2xl border-l-4 border-secondary bg-secondary/10 p-4">
              <p className="font-heading text-2xl font-bold text-green-600 md:text-3xl">365</p>
              <p className="mt-1 font-ui text-xs text-muted-foreground">
                Days of Celebration
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-gray-100 to-gray-200 shadow-xl">
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Star className="size-10 text-brand-yellow" />
              <span className="font-ui text-sm font-medium">Add Hero Image</span>
            </div>
          </div>
          <div className="absolute -right-4 -top-6 rounded-2xl bg-gradient-to-br from-accent to-accent/80 px-5 py-3 text-white shadow-lg sm:-right-8">
            <p className="font-heading text-xl font-bold">500+</p>
            <p className="font-ui text-xs text-white/90">Festival Activities</p>
          </div>
          <div className="absolute -left-4 bottom-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 px-5 py-3 text-white shadow-lg sm:-left-8">
            <p className="font-heading text-xl font-bold">50+</p>
            <p className="font-ui text-xs text-white/90">Food Vendors</p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-brand-orange via-brand-coral to-brand-pink px-4 py-16 text-white md:py-24">
      <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
      <div className="relative mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold leading-tight md:text-5xl">
          Ready to Experience Philadelphia?
        </h2>
        <p className="mt-4 font-serif text-lg text-white/90 md:text-xl">
          Discover hundreds of festivals happening all year long.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            className="bg-brand-yellow px-8 py-6 text-base text-brand-dark hover:bg-brand-yellow/90"
            render={<a href="#discover" />}
          >
            Explore Festivals
          </Button>
          <Button
            variant="outline"
            className="border-white px-8 py-6 text-base text-white hover:bg-white/10"
            render={<a href="/producer/submit" />}
          >
            Submit Festival
          </Button>
        </div>
      </div>
    </section>
  );
}

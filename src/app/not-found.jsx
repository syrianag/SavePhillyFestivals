import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold text-brand-orange">404</p>
      <h1 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
        This festival is off the map
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist, may have been moved, or
        is still waiting to be approved. Let&apos;s get you back to the fun.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/">
          <Button className="w-full sm:w-auto">Browse Festivals</Button>
        </Link>
        <Link href="/about">
          <Button variant="outline" className="w-full sm:w-auto">
            About Us
          </Button>
        </Link>
      </div>
    </section>
  );
}

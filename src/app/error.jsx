"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold text-brand-orange">Something went wrong</p>
      <h1 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
        We hit a snag
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        An unexpected error occurred while loading this page. Please try again,
        and if the problem persists, contact the admin team.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => reset()} className="w-full sm:w-auto">
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" className="w-full sm:w-auto">
            Back to Home
          </Button>
        </Link>
      </div>
    </section>
  );
}
